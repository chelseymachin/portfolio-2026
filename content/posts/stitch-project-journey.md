---
title: "Building Stitch: A Full-Stack Sewing Pattern Database From Scratch"
date: 2026-03-24
excerpt: "What happens when a sewing enthusiast who also writes code decides to build her own pattern management app on AWS? Spoiler: a lot of tears."
tags: [go, vue3, aws, postgres, terraform, ecs, fargate, cognito, s3, fullstack, solo-project]
thumbnail: "/images/posts/stitch-project-thumbnail.gif"
---

*A full solo build covering Go backends, AWS infrastructure chaos, presigned S3 drama, ECS task definition drift, and everything I learned shipping a scalable full-stack app from zero to live.*

---

**Why I Built This**

I sew. I also write software for a living. For a while those two hobbies lived in completely separate parts of my brain, but at some point I got frustrated enough with the state of existing sewing pattern management tools that I decided to just build my own.

The app I had in mind was basically a searchable, filterable community database for sewing patterns. Every pattern in the database would have full measurement range metadata (bust, waist, hip), garment type categorization, fabric tag recommendations, designer info, and a purchase link. Logged-in users could upload their own sewing projects, link them to patterns in the database, rate pattern difficulty, and maintain a favorites list. Admins (me) could manage the entire pattern library including image galleries. No browsing without an account. Pink and purple everywhere. Kawaii but make it functional.  Inspired by fiber art friends' community Ravelry, ofc.

I'm calling it the Stitch Project.

<div align="center">
    <img src="/images/posts/stitch-project-05.jpg" width="100%" height="100%" />
</div>
---

**Stack Decisions**

This was a solo build with a "I am maintaining this myself forever" constraint, so I leaned toward managed AWS services wherever cost was reasonable, and kept the backend small and stateless.

**Frontend:** Vue 3 with Vite, TypeScript, Pinia for state, Vue Router, and a fully custom component library to match the design system. No third-party UI kit. I wanted the aesthetic to be mine.

**Backend:** Go with the Chi router. Go was the right call here because the binary is tiny, the memory footprint is low, and Chi is idiomatic without being magical. No heavy ORM either. The database layer is handwritten SQL using `pgx` with typed repository structs. It sounds more work than using an ORM, but it made the complex filtering logic dramatically easier to reason about.

**Database:** PostgreSQL on RDS (db.t4g.micro). Around $15 a month on a reserved instance, managed backups, private subnet, done.

**Auth:** AWS Cognito. Love to hate it, but for a solo project where I am not building my own identity system it genuinely does the job. Email verification, JWT issuance, JWKS endpoint for backend token validation. The frontend uses the Cognito JS SDK to handle login flows client-side. The backend verifies JWTs on every protected request using Cognito's public keys.

**Media storage:** S3 with presigned upload URLs. The flow is: frontend requests a presigned URL from the backend, backend generates one, frontend uploads directly to S3. The file never passes through the backend server. This keeps Fargate lightweight and stateless.

**Infrastructure:** ECS Fargate for the containerized Go API, S3 and CloudFront for the frontend SPA and media CDN, Secrets Manager for runtime config injection, and Terraform for all of it. GitHub Actions handles CI/CD with separate workflows for the frontend and backend, each watching its own path in the monorepo.

One tradeoff I consciously made: I used `golang-migrate` for database migrations and embedded the migration files directly into the Docker image rather than running them as a separate step or init container. More on why in a minute.

---

**The Monorepo Structure**

The project lives in one repo with three top-level directories. This made the GitHub Actions setup clean because each workflow could just watch `backend/**` or `frontend/**` independently.

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
│   │   ├── response/             # JSON response helpers
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
│       ├── stores/               # Pinia stores
│       ├── types/                # TypeScript interfaces
│       └── views/                # page-level components
└── infrastructure/
    └── terraform/                # all AWS infrastructure as code
```

The `internal/db` layer is where most of the interesting work happens. Each repository struct takes a `pgxpool.Pool` and exposes typed query methods. No magic, no generated code, just functions that take context and return typed results or errors.

<img src="/images/posts/stitch-project-01.png" alt="browse view with patterns loaded and the filter sidebar visible" width="100%" height="100%" />
<img src="/images/posts/stitch-project-02.png" width="100%" height="100%" />
<img src="/images/posts/stitch-project-03.png" width="100%" height="100%" />
<img src="/images/posts/stitch-project-04.png" width="100%" height="100%" />
---

**Building the Pattern Filter System**

The filter sidebar was one of the more satisfying pieces to build and also one of the sneakier bugs to fix.

Users can filter patterns by gender, age group, multiple garment types, multiple fabric tags, designer, and bust/waist/hip measurements. The measurement filter is particularly useful: a pattern with a bust range of 34 to 44 inches will appear in results for someone filtering for 38 to 46 because the ranges overlap, not just when they are identical. On the backend this is a simple range intersection check, but it is the kind of thing that is easy to get wrong and frustrating to use when it is.

The backend uses a dynamic WHERE clause builder that appends conditions as filters come in. Here is the shape of it:

```go
var where []string
var args []interface{}
argIdx := 1

if f.Query != "" {
    where = append(where, fmt.Sprintf(
        "p.name ILIKE $%d OR p.description ILIKE $%d", argIdx, argIdx+1,
    ))
    args = append(args, "%"+f.Query+"%", "%"+f.Query+"%")
    argIdx += 2
}

// ... each filter condition appended similarly
```

The sneaky bug: the first version of the garment type filter used `GROUP BY` and `HAVING COUNT(DISTINCT pgt.garment_type_id) = N` which required a pattern to match ALL selected garment types. So if you selected "dress" and "skirt," you would only get results tagged with both. What you actually want is results tagged with either one. The fix was to drop the `GROUP BY / HAVING` and switch to a simple `IN` subquery:

```go
where = append(where, fmt.Sprintf(`
    p.id IN (
        SELECT pgt.pattern_id FROM pattern_garment_types pgt
        WHERE pgt.garment_type_id IN (%s)
    )`, strings.Join(placeholders, ","),
))
```

Much better. Same fix applied to fabric tags.

The frontend half of this had its own moment. The garment type chips were initially wired to a `toggleSingle` function that set the filter value to a single string instead of an array, so calling `.join()` on it later would throw. The fix was adding a `toggleMulti` function that maintains the filter as an actual string array, consistent with how fabric tags were already handled.

---

**Migrations: The Part Where I Tripped Over My Own Instructions**

Early in the project setup, I added `migrations/` to the `.dockerignore` file to keep build times fast during local development. Then later, when I needed migrations to run at container startup in production, I got a fun error where the container just could not find the migration files.

The lesson here is that `.dockerignore` entries have consequences and you will forget about them at the worst possible time.

The solution I landed on was running migrations via an entrypoint script that fires before the server starts. The migration files are embedded directly in the Docker image:

```bash
#!/bin/sh
set -e

echo "Running migrations..."
/app/migrate -path /app/migrations -database "$DATABASE_URL" up
echo "Migrations complete."

echo "Starting server..."
exec /app/server
```

The `set -e` is the important piece. If migrations fail, the container exits immediately and ECS will not route traffic to it. No silent failures, no partially migrated state confusing everything downstream. If something goes wrong you see it in CloudWatch right away.

The Dockerfile copies the migrate binary from the builder stage and includes the migrations directory explicitly:

```dockerfile
FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server ./cmd/api
RUN go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

FROM alpine:3.19
RUN apk --no-cache add ca-certificates curl
WORKDIR /app
COPY --from=builder /app/server .
COPY --from=builder /go/bin/migrate .
COPY migrations/ ./migrations/
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh
EXPOSE 8080
CMD ["./entrypoint.sh"]
```

Obvious in retrospect. Everything in infrastructure is obvious in retrospect.

<div align="center">
    <img src="/images/posts/stitch-project-06.gif" width="80%" height="80%" />
    <figcaption>^ Me re-reading the .dockerignore I wrote two months ago ^</figcaption>
</div>

---

**The ECS Task Definition Drift Situation**

This one is worth documenting in detail because it was the most frustrating debugging session of the whole project and the root cause is not obvious until you have seen it.

Terraform manages the ECS task definition, and the task definition is what tells ECS which container image to run and which secrets to inject at startup. At some point during the deployment phase, I renamed a secret key from `S3_BUCKET` to `AWS_S3_BUCKET` both in the task definition Terraform config and in Secrets Manager. I ran `terraform apply`. No errors.

But the container kept failing to start with an error about `S3_BUCKET` not being found. After a lot of log tailing and head scratching, the issue turned out to be two layered things:

First, Terraform had registered a new task definition revision with the correct key name, but the ECS **service** was pinned to an older revision because of `lifecycle { ignore_changes = [task_definition] }` in the service Terraform config. That flag is there to prevent CI/CD deploys from being overwritten by Terraform, which is the correct behavior, but it also means Terraform silently cannot update the service's active task definition.

Second, I was trying to force the update via `aws ecs update-service --task-definition stitch-backend:12` but the service was pulling a revision 8 task that was still running and healthy, and ECS was not actually replacing it.

The fix was: confirm the service pointed to the latest revision, then manually stop the running task to force ECS to start a replacement using the new task definition. Once the old task was stopped, ECS started a new one from the correct revision, migrations ran, health checks passed, and the service came up clean.

The takeaway: when you have `ignore_changes` on an ECS service, any config changes to the task definition need to be followed by an explicit `aws ecs update-service --task-definition <latest ARN>` call. Terraform apply alone will not do it.

---

**Presigned S3 Uploads and the Credentials Chain Problem**

Photo uploads use presigned S3 URLs, which is the right architecture for this kind of app. The pattern is simple: frontend asks backend for a presigned PUT URL, backend generates one with a 15-minute expiry, frontend uploads the file directly to S3 without it touching the backend server.

In development this worked fine because my local `.env` had `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` set. In production on ECS those environment variables do not exist. Instead, the ECS task role provides credentials automatically via the instance metadata service. The S3 service was initialized with explicit static credentials, and when those environment variables were empty in production, the AWS SDK returned `static credentials are empty` and the presign would fail.

The fix was to detect whether credentials were provided and fall back to the default credential chain when they were not:

```go
func NewS3Service(region, bucket, accessKeyID, secretAccessKey string) (*S3Service, error) {
    var cfg aws.Config
    var err error

    if accessKeyID != "" && secretAccessKey != "" {
        cfg, err = config.LoadDefaultConfig(context.Background(),
            config.WithRegion(region),
            config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
                accessKeyID, secretAccessKey, "",
            )),
        )
    } else {
        cfg, err = config.LoadDefaultConfig(context.Background(),
            config.WithRegion(region),
        )
    }
    // ...
}
```

Local dev uses static credentials from `.env`. Production uses the task role. Both work with the same code.

---

**CORS, The Gift That Keeps Taking**

CORS is one of those things that you think you have handled and then you deploy to production and discover you absolutely did not.

The local backend had `CORS_ALLOWED_ORIGINS=http://localhost:5173` in the `.env` file. Production needed `https://stitchproject.chelseymachin.com` as well. The problem is that the `Access-Control-Allow-Origin` response header has to be a single origin value. Browsers reject a comma-separated list. So you cannot just concatenate your allowed origins and call it done.

The correct approach is to read the `Origin` header from the incoming request, check it against your allowed list, and echo it back if it matches. I stored the allowed origins as a comma-separated env var, split it at startup into a slice, and then in the CORS middleware did a lookup against that slice for each incoming request.

What actually happened in practice: the production CORS config did not include the production domain for longer than it should have because the env var was set in Secrets Manager but the ECS task definition did not have a corresponding `secrets` entry to inject it into the container. The fix was adding `CORS_ALLOWED_ORIGINS` to the `secrets` block in `ecs.tf` and running `terraform apply`. Standard stuff, but it required tracing the full path from "env var set in Secrets Manager" to "env var available inside the container" to figure out where the chain was broken.

---

**The GitHub Actions OIDC Secret Placement Gotcha**

CI/CD for this project uses GitHub Actions with OIDC authentication to AWS. No long-lived access keys, just a trust relationship between the GitHub Actions runner and an IAM role.

The setup is straightforward in theory. In practice, there is one genuinely non-obvious thing: the `AWS_ROLE_ARN` secret needs to be a **repository secret**, not an **environment secret**. If your workflow does not declare `environment:` in the job definition, scoped environment secrets are invisible to it and the OIDC credential step will silently fail with a generic auth error.

This cost me longer than I want to admit. Once the secret was in the right place the CI pipeline ran end to end on the first try.

---

**Deploying the Frontend**

The frontend build and deploy workflow is comparatively calm. On a push to `main` with changes under `frontend/**`, GitHub Actions runs `npm run build`, syncs the dist folder to the S3 bucket with `--delete` to clean up old files, and then invalidates the CloudFront cache so users get the new version. The whole thing takes about two minutes.

One thing to be aware of: CloudFront cache invalidations take two to three minutes to propagate globally. If you push a fix and immediately check the production URL and see the old version, give it a minute before assuming something went wrong. Checking `index.html` in the bucket directly is a fast way to confirm the S3 sync actually ran before CloudFront has finished invalidating.

---

**What I Would Do Differently**

A few things I would revisit:

The `ignore_changes` flag on the ECS service is useful but the implicit contract it creates (Terraform registers new task definitions but does not update the running service) is easy to forget. I would add a comment in the Terraform code documenting this behavior explicitly so future-me does not debug it again.

I would also not add `migrations/` to `.dockerignore` at all, regardless of build time. The cost of rebuilding the migrations layer occasionally is much lower than the cost of debugging why migrations are not running in production.

The S3 credential handling could also be cleaner. Rather than branching on whether credentials are present, I could just always use the default credential chain and configure static credentials locally via `~/.aws/credentials` or the standard `AWS_*` env vars. That would make the code simpler and keep the local dev setup consistent with how the AWS SDK is meant to work.

---

**Wrapping Up**

Stitch is live. The patterns are in the database, the filter sidebar works, photos upload, favorites persist, and I can browse my own sewing pattern collection from anywhere. It took a lot of CORS errors and task definition archaeology to get here but that is kind of the point of solo projects.

If you sew and want an account, find me online. And if you are building something similar and hit the ECS task definition drift problem, I hope this saves you an afternoon.

<div>
    <a href="https://github.com/chelseymachin/stitch" target="_blank">GitHub Repo</a>
</div>
<div>
    <a href="https://stitchproject.chelseymachin.com" target="_blank">Stitch Project - Live</a>
</div>

<div align="center">
    <img src="/images/posts/stitch-project-07.gif" alt="browse view with patterns loaded and the filter sidebar visible" width="80%" height="80%" />
</div>