---
title: "Stitch Project: A Desperate Girl's Textile Based Ravelry"
date: "2026-03-18"
excerpt: "What happens when a sewist who codes decides the internet needs its own Ravelry — featuring presigned URLs, Terraform tantrums, and a surprising amount of feelings about CORS headers."
tags: ["AWS", "Vue 3", "GitHub Actions", "Go", "PostgreSQL", "Terraform", "ECS Fargate", "S3", "Cognito", "Chi Router", "TypeScript", "Monorepo"]
thumbnail: "/images/posts/stitch-project-thumbnail.gif"
---

*What happens when a sewist who codes decides the internet needs its own Ravelry — featuring presigned URLs, Terraform tantrums, and a surprising amount of feelings about CORS headers.*

---

If you've ever tried to find a sewing pattern based on something specific, like a woven dress with a low back in a size that actually fits your measurements, you know how painful the current landscape is. You're googling, clicking through Etsy listings, scrolling Instagram, asking in Facebook groups. There is no central place to go. There is no sewing equivalent of Ravelry.

That's the problem Stitch Project is trying to solve.

For those outside the fiber arts world, Ravelry is a beloved pattern database and social community for knitters and crocheters. You can search thousands of patterns by yarn weight, needle size, construction method, and garment type. You can see photos of real projects made by real people, read reviews, and filter by your exact gauge. It is genuinely one of the best community tools on the internet, and sewists have nothing like it.

So I built Stitch Project. And then I deployed it to production. And then I spent three weeks debugging it. But we're getting ahead of ourselves.

---

**What Is Stitch Project, Actually?**

Stitch Project is a full stack sewing pattern discovery and social community app. The core idea is simple: a searchable, visual database of sewing patterns where you can filter by garment type, fabric, body measurements, designer, and more. Beyond browsing, you can save patterns to your favorites and log your finished projects with photos so other people can see what a pattern actually looks like when made up in real fabric by a real person.

That last part is the social piece, and it's the part I find most exciting. Pattern envelope photos are notoriously unhelpful. They're styled on models, shot in studio lighting, and often show the pattern in fabrics you'd never actually use. What you actually want to see is thirty photos from thirty different people who made the same dress in different sizes and different fabrics, with notes on what they changed. That's what Stitch Project is building toward.

The app is live at [stitchproject.chelseymachin.com](https://stitchproject.chelseymachin.com) and it is very much a living project. There are rough edges. There are features I've been dreaming about for months. But it works, it's deployed, and I am unreasonably proud of it.

<img src="/images/posts/stitch-project-01.png" alt="browse view with patterns loaded and the filter sidebar visible" width="100%" height="100%" />

---

**The Tech Stack**

I made some deliberate choices here, and I want to talk through them because a few of them are a little unconventional for a solo project.

***Go on the Backend***

I chose Go for the backend and I will not apologize for it. Go is fast, the standard library is genuinely great, and the compiled binary makes Docker images tiny. For a project running on Fargate at the smallest possible CPU/memory allocation, this matters. The binary starts in milliseconds.

I'm using the **Chi router** because it's lightweight and composable without being a full framework. The middleware chaining is clean and it plays nicely with the standard `net/http` interface, which means I'm not locked into anything proprietary.

The database layer is just raw SQL with **pgx**, no ORM. I know this is a spicy opinion but I find ORMs frustrating for anything beyond basic CRUD. When your queries get interesting (lateral joins, array operators, full text search) you end up fighting the abstraction anyway. Writing SQL directly means I know exactly what's hitting the database and can troubleshoot it more cleanly when I need to make changes.

***Vue 3 on the Frontend***

Vue 3 with the Composition API is genuinely one of my favorite things to write. The reactivity system is intuitive, single file components keep everything organized, and TypeScript support has gotten really good. Vite makes the dev experience fast enough that I actually enjoy frontend work, which is saying something.

***PostgreSQL***

Postgres was a no brainer. Array columns, full text search, great JSON support, rock solid. The pattern filtering uses some fun Postgres features including array containment operators for the gender field and `plainto_tsquery` for the search functionality.

***AWS (The Whole Stack)***

This is where things get spicy. I'm running the full AWS production setup: ECS Fargate for the backend container, RDS for the database in a private VPC subnet, S3 and CloudFront for the frontend and media, Cognito for auth, and ALB for HTTPS termination. Everything is managed with Terraform.

Is this overkill for a solo project in its early days? Absolutely. Did I learn an enormous amount building it? Also absolutely. And the architecture scales well, which matters to me because I have real plans for where this is going.

---

**Architecture Decisions I'd Make Again**

***Embedding Migrations in the Docker Container***

One of the early headaches was figuring out how to run database migrations in a private subnet environment. The RDS instance lives in a private subnet by design (you don't want your database publicly accessible), which means you can't just `psql` into it from your laptop.

The solution I landed on was embedding migrations directly into the Docker image and running them at container startup via an entrypoint script. Simple, reliable, and it means every deploy automatically runs any pending migrations before the server starts.

```bash
#!/bin/sh
set -e

echo "Running migrations..."
/app/migrate -path /app/migrations -database "$DATABASE_URL" up
echo "Migrations complete."

echo "Starting server..."
exec /app/server
```

The `set -e` is the important part here. If migrations fail, the container exits immediately and ECS won't route traffic to it. No silent failures = no half migrated database state.

***Presigned S3 Uploads***

For photo uploads I'm using presigned S3 URLs. The flow is: the frontend asks the backend for a presigned URL, the backend generates one and returns it, and then the frontend uploads directly to S3 without the file ever passing through the backend server.

I think this is the right pattern for a few reasons. It keeps the backend fast and stateless. It doesn't waste Fargate CPU and memory on file transfers. And it means the backend never needs to buffer large file uploads in memory.

```go
func (s *S3Service) PresignPutURL(ctx context.Context, s3Key, contentType string) (string, error) {
    req, err := s.presigner.PresignPutObject(ctx, &s3.PutObjectInput{
        Bucket:      aws.String(s.bucket),
        Key:         aws.String(s3Key),
        ContentType: aws.String(contentType),
    }, s3.WithPresignExpires(15*time.Minute))
    if err != nil {
        return "", fmt.Errorf("presign put: %w", err)
    }
    return req.URL, nil
}
```

The 15 minute expiry is generous enough for slow connections but short enough that leaked URLs aren't a meaningful security risk.  Especially as there's no real 'private' media on the site.  Projects and media uploaded for them are available for any social users to browse.

***CORS as a Dynamic Origin Mirror***

This one tripped me up and I want to document it properly because the solution is not obvious. When you have multiple allowed origins (localhost for dev, your production domain), you can't just set the `Access-Control-Allow-Origin` header to a comma separated list. Browsers require a single origin value.

The correct approach is to read the `Origin` header from the incoming request, check it against your allowed list, and echo it back if it matches.

```go
allowedOrigins := make(map[string]bool)
for _, o := range strings.Split(cfg.CORSOrigins, ",") {
    allowedOrigins[strings.TrimSpace(o)] = true
}

r.Use(func(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        origin := r.Header.Get("Origin")
        if allowedOrigins[origin] {
            w.Header().Set("Access-Control-Allow-Origin", origin)
        }
        w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
        if r.Method == http.MethodOptions {
            w.WriteHeader(http.StatusNoContent)
            return
        }
        next.ServeHTTP(w, r)
    })
})
```

This feels obvious in hindsight but it is not something that's well documented in most CORS overviews, and in enterprise production scenarios this is typically already scaffolded into how you work between dev and production environments and isn't something you're commonly designing yourself unless you're constantly spinning up new apps for use in your workplace for some wild reason.  So it was helpful to work through as an exercise.

---

**The File Structure**

I organized this as a monorepo with three top level directories. The separation felt clean and it made the CI/CD setup straightforward since each workflow can watch its own path.

```
stitch/
├── backend/
│   ├── cmd/
│   │   └── api/
│   │       └── main.go           # server setup, routing, middleware
│   ├── internal/
│   │   ├── config/               # environment loading
│   │   ├── db/                   # repository layer, all SQL lives here
│   │   │   ├── patterns.go       # pattern queries + filtering
│   │   │   ├── projects.go       # project queries
│   │   │   ├── users.go          # user repository
│   │   │   └── favorites.go      # favorites repository
│   │   ├── handlers/             # HTTP handlers, one file per resource
│   │   ├── middleware/           # Cognito JWT auth, admin check
│   │   ├── models/               # shared data types
│   │   ├── response/             # JSON helpers
│   │   └── storage/              # S3 service
│   ├── migrations/               # numbered SQL migration files
│   ├── Dockerfile
│   └── entrypoint.sh
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── layout/           # AppNav, shared layout
│       │   ├── patterns/         # PatternCard, FilterSidebar, HeartButton
│       │   ├── projects/         # DifficultyStars, project components
│       │   └── admin/            # QuickAddModal
│       ├── services/             # typed API client functions
│       ├── stores/               # Pinia stores for patterns, favorites, auth
│       ├── types/                # TypeScript interfaces
│       └── views/                # page level components
└── infrastructure/
    └── terraform/                # all AWS infrastructure as code
```

The `internal/db` layer is where most of the interesting work happens. Each repository struct takes a `pgxpool.Pool` and exposes typed methods. There's no magic, no code generation, just functions that take context and return typed results or errors.

<img src="/images/posts/stitch-project-02.png" alt="Screenshot of the admin pattern form with the image upload panel and the chip selectors for garment type and fabric tags" width="100%" height="100%" />
---

**The Pattern Filtering System**

The filter sidebar was one of the more satisfying pieces to build. Users can filter by gender, age group, multiple garment types, multiple fabric tags, designer, and bust/waist/hip measurement ranges. All of these combine with AND logic except within a category (selecting two garment types returns patterns that match either one, not both).

On the backend, the filtering is built with a dynamic WHERE clause that appends conditions as they come in. The measurement filtering is particularly nice because it handles the overlap case correctly: a pattern with a bust range of 34 to 44 will appear in results for someone filtering for 38 to 46 because the ranges intersect, not just because they're identical.

```go
if f.BustMin != nil {
    where = append(where, fmt.Sprintf("p.bust_max >= $%d", argIdx))
    args = append(args, *f.BustMin)
    argIdx++
}
if f.BustMax != nil {
    where = append(where, fmt.Sprintf("p.bust_min <= $%d", argIdx))
    args = append(args, *f.BustMax)
    argIdx++
}
```

The logic reads: "show me patterns whose maximum size is at least my minimum, AND whose minimum size is no more than my maximum." This correctly captures partial overlaps, which is what you actually want when shopping for a pattern.

On the frontend, the filter state lives in a single reactive object that gets watched and triggers a new API call whenever it changes. The sidebar component uses `v-model` to emit updates back to the parent, which keeps the filter state ownership in one place.

```typescript
watch(filters, (newFilters) => { 
  patternsStore.fetchPatterns(newFilters) 
}, { deep: true })
```

---

**Things That Were Painful**

***AWS Secrets Manager Key Naming***

I spent an embarrassing amount of time on a mismatch between the key name in Secrets Manager (`S3_BUCKET`) and the environment variable my config was reading (`AWS_S3_BUCKET`). The ECS task definition pulls specific JSON keys from the secret and injects them as environment variables, and those names need to match exactly. When they don't, the container refuses to start with a cryptic initialization error that doesn't tell you which key is missing.

The lesson: keep your secret key names and your environment variable names identical and document them somewhere. Future you will thank present you.

***The Private Subnet Migration Problem***

Running migrations against a database in a private subnet with no public access is genuinely tricky. I went through several approaches: trying to connect from localhost (blocked by the subnet), trying AWS CloudShell (not in the VPC), trying EC2 Instance Connect (needed the right AMI and security group setup). Eventually I landed on a bastion EC2 instance, which works fine but feels like a lot of ceremony for what should be a simple task.

The long term solution is what I described earlier: migrations embedded in the container. But the path to getting there was more adventure than I expected.

***PowerShell and JSON***

If you're on Windows and you're working with the AWS CLI, be prepared for PowerShell to mangle your JSON strings in creative ways. Single quotes, double quotes, BOM characters, all of it. The solution that actually works consistently is writing your JSON to a file with `[System.IO.File]::WriteAllText()` and passing the file path with `file://` to the CLI.  Helpful when you're troubleshooting a bunch of terraform and AWS CLI steps and outcomes for sure.

---

**Design Decisions**

I wanted Stitch Project to feel like a real product, not a developer side project. The design uses a warm cream and blush palette with plum accents, neobrutalist inspired borders, and display typography that has a little personality. It's feminine without being saccharine, which is a line I care about.

<img src="/images/posts/stitch-project-03.png" alt="Close up of the pattern detail view showing the gallery, tags, and measurement boxes" width="100%" height="100%" />


The filter sidebar uses chip selectors instead of dropdowns for garment type and fabric because chips make the currently active filters immediately visible at a glance. You shouldn't have to open a dropdown to know what you've filtered by.

The admin interface matches the main app's visual language intentionally. A lot of admin panels feel like they belong to a completely different application, which I find disorienting. If I'm going to spend time adding patterns, it should feel nice to use.

---

**What's Coming Next**

This is where I get excited, because the current version is genuinely just the foundation.

***A real community feed.*** Right now Stitch Project has accounts and project logging, but the social layer is still thin. The vision is a home feed where you can follow other sewists, see recent projects from people you follow, and discover makers whose taste matches yours. This is the Ravelry core feature I most want to build.

***Pattern reviews and ratings.*** The difficulty field currently lives on projects (how hard did *you* find it) but I want aggregated community ratings on the pattern itself, plus written reviews. Being able to read "graded very small, size up two" or "the instructions are confusing for the collar but the fit is great" before buying a pattern is genuinely useful and something the sewing community currently shares informally in Facebook groups and blog posts.

***Fabric stash tracking.*** A proper fabric inventory where you can log yardage, note what you've used it for, and get suggestions for which stash fabrics would work for a pattern based on its fabric tags. This is the feature I want most personally.

***Mobile app.*** The web app is responsive but a native mobile experience for logging projects on the go (you just finished sewing something and you want to log it while you're still at the machine) would be genuinely useful. This is further out on the roadmap but it's on the list.

<img src="/images/posts/stitch-project-04.png" alt="Screenshot of the project form showing the photo upload zone and difficulty stars" width="100%" height="100%" />

---

**Final Thoughts**

Building Stitch Project taught me more about production AWS infrastructure in a few weeks than I'd learned in the previous couple of years of reading about it. There's a real difference between understanding how ECS and VPCs and Secrets Manager work conceptually and having actually debugged a container that wouldn't start because of a key name mismatch at 11pm.

The sewist community deserves the tools that knitters have had for years. The codebase is solid, the infrastructure is in place, and I have a long list of features I'm genuinely excited to build. If you sew and you want to try it out, you can sign up at [stitchproject.chelseymachin.com](https://stitchproject.chelseymachin.com). I'd love to know what you think.

More posts to come as the features ship 🧵