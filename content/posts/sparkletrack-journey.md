---
title: "Building SparkleTrack: A Hobby Developer's Issue Tracker"
date: "2026-03-09"
excerpt: "How I built a desktop issue tracker with Vue 3 and Electron, rearchitected the entire backend when the release pipeline exploded, survived an IPC migration, and learned more about native modules than I ever wanted to know."
tags: ["Electron", "Vue 3", "Drizzle ORM", "SQLite", "GitHub Actions", "IPC",]
thumbnail: "/images/posts/sparkletrack-thumbnail.gif"
---

*A deep dive into building a desktop app from scratch — Express backends, Electron nightmares, IPC migrations, and everything I learned along the way.*

---

**Why I Built This**

Every hobby developer has the same problem: too many projects, too little structure. I had open GitHub tabs for repos I owned, Notion pages with half-finished to-do lists, and sticky notes I stopped looking at months ago. The irony of building an issue tracker to manage my own issue-tracking chaos is not lost on me, but here we are.

I wanted something that felt like a *real* tool so not a markdown file, not a Notion database, not another browser tab I'd forget to open. A desktop app. Something that lived in my dock, launched instantly, and felt like it was actually built for me. So I built SparkleTrack: a self-contained issue tracker for hobby developers, with a kanban board, project-scoped labels, activity feeds, search, export, and a soft pink aesthetic that makes it genuinely pleasant to open. Think Linear, but cute, local, and with zero subscription fees.

This is the story of how I built it, what broke (a lot of things), and what I'd do differently.

<img src="/images/posts/sparkletrack-01.png" width="100%" height="100%" />
<img src="/images/posts/sparkletrack-02.png" width="100%" height="100%" />
<img src="/images/posts/sparkletrack-03.png" width="100%" height="100%" />

---

**The Stack Decision**

Before writing a single line, I had to figure out what I was actually building. The requirements were simple: a desktop app, local data storage, distributable to other hobby developers without them needing to touch a terminal.

Here's where I landed:

```
✨ SparkleTrack Final Stack

┌──────────────────────────────────────────────────┐
│  FRONTEND               │  ELECTRON LAYER        │
│  Vue 3 + Vite           │  Electron 40           │
│  Pinia stores           │  contextBridge + IPC   │
│  Vue Router             │  better-sqlite3        │
│  SCSS design tokens     │  Drizzle ORM           │
│                         │                        │
│  TOOLING                │  RELEASE               │
│  Vitest                 │  electron-builder      │
│  ESLint                 │  GitHub Actions CI/CD  │
└──────────────────────────────────────────────────┘
```

Vue 3 was a no-brainer because it's what I use at work and the Composition API fits how my brain thinks about component state. Electron was the obvious choice for desktop distribution since it targets Windows, Mac, and Linux from one codebase and I didn't want to learn Tauri from scratch on a hobby project. SQLite was also an obvious choice. It's literally just a file, it travels with the user, and there's no database server to manage.

The trickier decision was the ORM. I landed on Drizzle because it's lightweight, TypeScript-first, and the query builder feels close enough to raw SQL that you're never fighting the abstraction. (That said, Drizzle and Electron have a fun little relationship we'll get to.)

---

**The Original Architecture (Before Things Got Interesting)**

The initial version of SparkleTrack was a monorepo with two workspace packages:

```
sparkletrack/
├── packages/
│   ├── backend/           ← Express + better-sqlite3 + Drizzle
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   ├── client.js
│   │   │   │   ├── schema.js
│   │   │   │   └── migrations/
│   │   │   └── routes/
│   │   │       ├── projects.js
│   │   │       ├── issues.js
│   │   │       ├── labels.js
│   │   │       ├── comments.js
│   │   │       ├── dashboard.js
│   │   │       ├── search.js
│   │   │       └── export.js
│   │   └── server.js
│   └── frontend/          ← Vue 3 + Vite + Pinia
│       ├── src/
│       │   ├── api/
│       │   │   └── axios.js
│       │   ├── stores/
│       │   ├── views/
│       │   └── components/
│       └── vite.config.js
├── package.json           ← npm workspaces root
└── ...
```

The frontend made HTTP calls via axios to the localhost, and the Express backend served all the data. Running `npm run dev` fired up both packages concurrently. It worked great — locally.

<div align="center">
      <img src="/images/posts/sparkletrack-04.jpg" alt="I swear it did!" width="40%" height="40%" />
</div>

The problem was "distributable desktop app." For Electron to package this cleanly, it needed to spawn the Express backend as a child process at runtime, manage its lifecycle, handle port conflicts, and hope the bundler included everything correctly. That's a lot of moving parts to babysit. As it turns out, this is the part that eventually sent me down a much better path.

---

**The Electron Packaging Arc (Or: That Time GitHub Actions Humbled Me)**

<div align="center">
      <img src="/images/posts/sparkletrack-05.gif" alt="BIG REGRET" width="60%" height="60%" />
</div>

Once the core app was working, I wanted to set up automated releases through GitHub Actions — push to `main`, get a `.dmg`, `.exe`, `.AppImage`, and `.deb` automatically. Simple enough in theory.

The first version of `release.yml` was straightforward: trigger on `v*` tags, run `electron-builder` on a matrix of `[macos-latest, windows-latest, ubuntu-latest]`. What followed was an extended conversation with GitHub Actions logs that I can only describe as character-building.

The first real wall: `better-sqlite3` is a native Node module that compiles against a specific Node ABI version. When Electron runs your app, it uses its own Node runtime, which almost certainly doesn't match the Node version the module was originally compiled against. This throws a delightful error that looks like:

```
Error: The module was compiled against a different Node.js version
NODE_MODULE_VERSION mismatch
```

The fix is `electron-rebuild`, which recompiles native modules against the Electron Node version. This needed to be in the GitHub Actions workflow as a dedicated step:

```yaml
- name: Rebuild better-sqlite3 for Electron
  shell: bash
  run: npx electron-rebuild -f -w better-sqlite3
```

Without this step, the packaged app opens, cheerfully initializes, and then immediately crashes on any database call.

Then there was the `GITHUB_TOKEN` loop problem. My updated workflow had a `tag` job that bumped the version in `package.json`, committed it with a "chore: bump version" message, and pushed a new tag. The `build` job was supposed to trigger off that tag. Except it never ran.

The reason: GitHub Actions won't trigger subsequent workflows from events caused by the built-in `GITHUB_TOKEN` bot. This is an intentional anti-infinite-loop measure. To actually chain workflow triggers, you need a Personal Access Token (PAT) with `repo` and `workflow` scopes. The `tag` job uses the PAT to push, GitHub sees it as a real user action, and the `build` job fires correctly.

There was also a fun moment where the `build` job was running three times per push because the `if:` condition was missing. Small omission, chaotic result.

The final pipeline looks like this:

```
Push to main (non-chore commit)
         │
         ▼
    tag job (ubuntu)
    ├── npm version patch --no-git-tag-version
    ├── git commit "chore: bump version to X.X.X"  [skips re-trigger]
    └── git push tag vX.X.X  [uses PAT_TOKEN]
                  │
                  ▼  (tag push triggers new workflow run)
    build job × 3 (matrix)
    ├── macos-latest   ──► SparkleTrack-X.X.X.dmg
    ├── windows-latest ──► SparkleTrack-X.X.X-Setup.exe
    └── ubuntu-latest  ──► SparkleTrack-X.X.X.AppImage + .deb
```

The "chore: bump version" commit message pattern is the guard that prevents the bot's own commit from re-triggering the `tag` job. One `!contains(github.event.head_commit.message, 'chore: bump version')` condition and the loop is dead.

---

**The Architecture Decision That Changed Everything**

Here's where the "keep Express and spawn it as a child process" plan started feeling wrong. Getting `better-sqlite3` to behave across the packaging pipeline was already complicated and adding "and also manage a long-running Express server from inside Electron's main process" was more complexity than the use case warranted. There was also no good story for what happens if the port is already in use, or if the Express process crashes without taking Electron down with it.

The cleaner approach was to ditch the separate backend entirely and move all data access into Electron's main process using IPC (Inter-Process Communication). This is what Electron was actually designed for as the main process has full Node.js access, the renderer process is sandboxed like a browser, and `contextBridge` provides a safe, explicit API surface between them.

The architectural difference:

```
BEFORE (Express child process)                AFTER (Electron IPC)

  Renderer                                      Renderer
    │ HTTP fetch / axios                           │ window.api.invoke(...)
    ▼                                             ▼
  localhost:3001 (Express)           contextBridge (preload.js)
    │ SQL queries                                  │ ipcRenderer.invoke(...)
    ▼                                             ▼
  better-sqlite3                       ipcMain.handle(...)  ← main process
                                                  │ Drizzle queries
                                                  ▼
                                         better-sqlite3 (bundled)
```

Fewer moving parts, no port management, no child process lifecycle to babysit, and the whole thing bundles cleanly because everything lives in the `electron/` directory.

---

**The IPC Migration**

The migration had a clear pattern: every Express route becomes an `ipcMain.handle` call, and every axios call in the frontend becomes a `window.api.invoke` call. The naming convention I used was `resource:action`:

```
GET  /projects        →  projects:getAll
POST /projects        →  projects:create
GET  /projects/:id    →  projects:getOne
PUT  /projects/:id    →  projects:update
DELETE /projects/:id  →  projects:delete
GET  /issues          →  issues:getAll
POST /issues          →  issues:create
... and so on for labels, comments, dashboard, search, export
```

The handler pattern is satisfyingly clean compared to Express routes:

```js
// Express route
router.get('/projects', (req, res) => {
  const rows = db.prepare('SELECT * FROM projects').all()
  res.json(rows)
})

// IPC handler equivalent
ipcMain.handle('projects:getAll', () => {
  return db.select().from(projects).all()
})
```

No `req`, no `res`, no JSON serialization. Just return the data. Electron handles the serialization automatically.

The `preload.js` file is the bridge between worlds. It uses `contextBridge` to expose a safe `window.api` object to the renderer, without giving the renderer direct access to Node or Electron internals:

```js
// electron/preload.js — must be CommonJS!
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('window.api', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args)
})
```

One critical thing that bit me: **preload scripts must be CommonJS**, even when the rest of the project uses ES modules (`"type": "module"` in `package.json`). Using `import` syntax in the preload file causes a completely silent failure where `window.api` just never gets defined, and your renderer silently can't talk to anything. 

For the frontend, axios was replaced with a thin IPC shim that preserved the same calling interface so the stores didn't need to change much:

```js
// Before: axios call
const res = await axios.get('/projects')
return res.data

// After: IPC shim
const result = await window.api.invoke('projects:getAll')
return result
```

The Drizzle ORM integration also needed a specific setup. The `createDb()` function in `electron/db.js` creates the `better-sqlite3` instance, wraps it in Drizzle, and returns both the db handle and a `migrate` function:

```js
export function createDb() {
  const userDataPath = app.getPath('userData')
  const dbPath = path.join(userDataPath, 'sparkletrack.db')

  const sqlite = new Database(dbPath)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  const db = drizzle(sqlite)

  const migrate = () => {
    sqlite.pragma('foreign_keys = OFF')
    drizzleMigrate(db, { migrationsFolder: path.join(__dirname, 'migrations') })
    sqlite.pragma('foreign_keys = ON')
  }

  return { db, migrate }
}
```

Toggling foreign keys off during migration is required by SQLite when migrations involve table recreation, which Drizzle does under the hood for certain schema changes. Foreign key violations during migration are a great way to have a bad afternoon.

One other thing worth calling out: Vite's `base` config. When building for Electron, you need `base: './'` in `vite.config.js`. Without it, built asset paths are absolute (`/assets/index.js`), which works fine for web deployments but fails when the app loads via the `file://` protocol in a packaged Electron build. The assets just don't load and you get a blank white window with no useful error.

---

**The Final File Structure**

After the migration, the `packages/backend` directory was gone entirely. Everything lives either in `electron/` or `packages/frontend/`:

```
sparkletrack/
├── electron/
│   ├── main.js          ← app lifecycle, window creation
│   ├── preload.js       ← contextBridge (CommonJS!)
│   ├── db.js            ← better-sqlite3 + Drizzle setup
│   ├── ipc.js           ← all ipcMain.handle registrations
│   ├── schema.js        ← Drizzle schema (moved from backend)
│   ├── migrations/      ← collapsed into single init migration
│   └── icons/
│       ├── icon.png
│       ├── icon.ico
│       └── icon.icns
├── packages/
│   └── frontend/
│       ├── src/
│       │   ├── api/
│       │   │   └── ipc.js     ← IPC shim replacing axios
│       │   ├── stores/
│       │   ├── views/
│       │   └── components/
│       └── vite.config.js     ← base: './' is load-bearing
└── package.json
```

One more thing that needed cleanup: the Drizzle migrations. During development I had accumulated several migration files, some of which reflected schema states that no longer existed because I'd manually altered tables between generates. Drizzle's migration runner is strict and it runs files in order and expects each one to apply cleanly. The fix was to collapse all migrations into a single clean init file that represented the final schema, then delete everything else. New installs start from a clean slate, and the migration history is honest again.

**What I Learned**

**Native modules in Electron are not optional complexity.** If your app touches the filesystem, a database, or any C++ addon, you will eventually hit a `NODE_MODULE_VERSION` mismatch. `electron-rebuild` belongs in your `postinstall` script from day one, not after you've shipped a broken build.

**The "just use Express" instinct is wrong for desktop apps.** It feels familiar and works in dev, but it creates a fragile runtime dependency that's surprisingly hard to package correctly. IPC is the right abstraction — faster, simpler, and it's what Electron was designed for. If you're building a local-first desktop app, your backend should live in the main process.

**Preload scripts are CommonJS. Full stop.** Even in 2026. Even with `"type": "module"` in your root `package.json`. Don't fight it, just use `require()`.

**Migrations are append-only history.** I broke my migration runner by manually altering a table between Drizzle-generated migrations, creating an inconsistency the runner couldn't reconcile. Never touch migration files after they're committed. Schema is wrong? Generate a new migration.

**`base: './'` in Vite is load-bearing for Electron.** Without it, your built app is a blank white window and you'll spend an hour wondering if the IPC wiring is broken before realizing it's just asset paths.

**A PAT is required for bot-triggered workflow chaining.** GitHub's default bot token can't trigger other workflows — that's intentional. If your CI creates a tag that should trigger a release build, that push must use a Personal Access Token or the downstream job will never run.

**The irony of spending more time on the tooling than on the features is very on-brand for a hobby developer. I regret nothing.**

---

**What's Next**

SparkleTrack ships and installs cleanly on all three platforms. But it's version 1.0 — there's a lot of road left.

Things I want to add:

- **Auto-updater** — `electron-updater` integrates with the same GitHub Releases pipeline already in place. When a new version ships, the app should notify and update itself.
- **Markdown support in issue descriptions and comments** — right now it's plain text. Hobby project documentation deserves formatting.
- **Milestone tracking** — grouping issues into milestones for a lightweight sprint-style workflow.
- **Keyboard shortcuts** — `Cmd+K` command palette for quick navigation, `N` to create a new issue, the usual stuff.
- **Dark mode** — the design token system is already set up for it, it's mostly just defining the alternate token values and wiring a toggle.
- **Import from GitHub Issues** — if you have an existing repo with issues you want to pull in, a one-time import would make adoption much easier for developers who already use GitHub for tracking.

The project is open source at [github.com/chelseymachin/sparkletrack](https://github.com/chelseymachin/sparkletrack) if you want to poke around, steal the IPC migration pattern, or file an issue about SparkleTrack in SparkleTrack.

---

*Built with ✨, Vue 3, Electron, better-sqlite3, Drizzle ORM, and an embarrassing number of GitHub Actions reruns.*