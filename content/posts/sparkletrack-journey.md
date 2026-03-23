---
title: "Building SparkleTrack: A Hobby Developer's Issue Tracker"
date: "2026-03-10"
excerpt: "How I built a desktop issue tracker with Vue 3 and Electron, then rearchitected the entire backend when the release pipeline broke — and everything I learned along the way."
tags: ["Electron", "Vue 3", "Drizzle ORM", "SQLite", "GitHub Actions"]
thumbnail: "/images/posts/sparkletrack-thumbnail.gif"
---

*A deep dive into building a desktop app from scratch featuring Express backends, Electron nightmares, IPC migrations, and everything I learned along the way.*

---

**Why I Built This**

Every hobby developer has the same problem: too many projects, too little structure. I had open tabs full of GitHub issues for projects I owned, Notion pages with half-finished to-do lists, and sticky notes I stopped looking at months ago. The irony of building an issue tracker to track my own issue-tracking chaos was not lost on me.

I wanted something that felt like a *real* tool. Not a markdown file, not a Notion database, not a browser tab I'd forget to open. A desktop app. Something that lived on my taskbar, launched instantly, and felt like it was built for me. So I built SparkleTrack: a self-contained issue tracker for hobby developers, with a kanban board, project-scoped labels, activity feeds, and a soft pink aesthetic that makes it genuinely pleasant to open.

This is the story of how I built it, what went wrong (a lot), and what I'd do differently.

<img src="/images/posts/sparkletrack-01.png" alt="SparkleTrack main dashboard — project list and kanban overview" width="100%" height="100%" />

---

**The Stack Decision**

| Layer | Choice |
|---|---|
| Frontend | Vue 3 + Vite |
| Database | better-sqlite3 |
| ORM | Drizzle |
| Testing | Vitest + ESLint |
| Release | electron-builder + GitHub Actions |

I knew from the start I wanted Vue 3 for the frontend. It's what I use at work and the Composition API fits how my brain thinks about state. Electron was the obvious choice for desktop distribution. It's the industry standard for this kind of app and I didn't want to learn Tauri from scratch on a hobby project.

For the database, SQLite was a no-brainer. It's a file. It travels with the user. There's no server to provision, no connection string to configure. For a single-user desktop app, it's perfect. I picked Drizzle ORM over raw SQL because I wanted type safety and I'd been wanting to try it — and I'm glad I did. The query builder feels natural and the schema-as-code approach meant my database structure was always in sync with my TypeScript types.

And of course, it had to be pink.

---

**The Original Architecture: Express + Electron**

My first instinct was to structure the app as a monorepo with two packages: a frontend Vue app and a backend Express API. This felt familiar as it's essentially a web app architecture dropped into an Electron shell.

```
Electron Main Process
      │
      ▼
Spawns child process
      │
      ▼
Express Server (Node.js)       Vue 3 Frontend
├── /api/projects       ◄────  axios calls
├── /api/issues                via Vite proxy
├── /api/labels
├── /api/comments
└── better-sqlite3 (DB)
```

The Express server would handle all the data logic, Drizzle would manage migrations and queries, and the Vue frontend would communicate with it over HTTP. Just like a normal web app. Electron was essentially a browser wrapper with a hidden local server running behind it.

This worked great in development. Features came together quickly: projects with prefixes and color-coded icons, a kanban board with drag-and-drop reordering, labels, comments, an activity feed, full-text search, and a data export endpoint.

<img src="/images/posts/sparkletrack-02.png" alt="SparkleTrack kanban board — issue cards with drag-and-drop columns" width="100%" height="100%" />

---

**The Release Problem**

Everything was working beautifully in dev. Then I tried to ship it.

`electron-builder` packages your app into an installer, and that installer needs to be completely self-contained. My architecture had a fatal flaw: it was spawning a Node.js child process to run the Express server. In a packaged Electron app, `node` is not in the PATH. Electron ships its own Node runtime internally, but that runtime isn't available as a standalone binary you can spawn.

The symptoms were baffling at first. On Mac, the app would open a blank window and silently do nothing. On Windows, it wouldn't even open. The GitHub Actions release builds would succeed, producing `.exe` and `.dmg` files, but the apps themselves were broken.

After a lot of debugging the root cause became clear. The Express server was never starting because `spawn('node', ['server.js'])` was failing silently. No process, no API, no data.

The fix required rethinking the entire backend architecture.

---

**The Migration: Express → Electron IPC**

Electron has a built-in solution for exactly this problem: IPC (Inter-Process Communication). Instead of HTTP requests to a separate server process, IPC lets the renderer send messages directly to the main process, which is already a Node.js environment with full filesystem access.

**Before:**
```
Renderer  →  HTTP (axios)  →  Express Server (child process)  →  better-sqlite3
```

**After:**
```
Renderer  →  ipcRenderer.invoke()  →  Electron Main Process  →  better-sqlite3
```

The migration involved four key changes:

**1. Moving the database into the main process.**
Instead of the Express server opening the SQLite database, `electron/db.js` now initializes it directly using `app.getPath('userData')` the standard Electron path for user data that works correctly across all platforms and install locations.

**2. Converting Express routes to IPC handlers.**
Every route handler became an `ipcMain.handle()` call. A route like `GET /api/projects` became:

```js
ipcMain.handle('projects:getAll', () =>
  db.select().from(projects).all()
)
```

The logic was identical and only the transport layer changed.

**3. Rewriting the preload script.**
Electron's `contextBridge` securely exposes a `window.api` object to the renderer, with one method per IPC channel. The renderer never touches `ipcRenderer` directly. Now, it just calls `window.api.projects.getAll()`.

**4. Replacing axios with an IPC wrapper.**
Rather than rewriting every component that called the API, I replaced `axios.js` with a thin wrapper that matched the axios interface (`api.get()`, `api.post()`) but routed each call to the appropriate IPC channel. Every component kept working without changes.

The new file structure after the migration:

```
sparkletrack/
├── .github/workflows/
│   └── release.yml
├── electron/
│   ├── main.js
│   ├── preload.js       ← contextBridge (must be CJS)
│   ├── db.js            ← SQLite + Drizzle init
│   ├── ipc.js           ← all IPC handlers
│   ├── schema.js
│   └── migrations/
└── packages/
    └── frontend/
        └── src/
            ├── api/     ← IPC wrapper
            ├── components/
            ├── composables/
            ├── stores/
            └── views/
```

The entire `packages/backend` directory was deleted. The app went from two packages to one, release builds started working, and startup time dropped noticeably as well. No more waiting for an Express server to initialize before the window would load.

---

**Two Gotchas Worth Calling Out**

**`better-sqlite3` needs to be rebuilt for Electron's Node version.**
It's a native module compiled against a specific Node ABI. The system Node version and Electron's internal Node version are almost certainly different. Add `npx electron-rebuild -f -w better-sqlite3` to your `postinstall` script and your GitHub Actions release workflow from day one. Without it, the packaged app throws a cryptic `NODE_MODULE_VERSION` mismatch and refuses to start.

**Preload scripts must be CommonJS.**
Even in 2026. Even with `"type": "module"` in your `package.json`. The `import` syntax in a preload file causes a silent failure where `window.api` just never gets defined. Switch to `const { contextBridge } = require('electron')` and move on.

---

**The Release Pipeline**

The goal: push to `main`, get a release with `.exe`, `.dmg`, `.AppImage`, and `.deb` files automatically.

```
Push to main
     │
     ▼
tag job (ubuntu)
├── npm version patch
├── git commit "chore: bump version to X.X.X"
└── git push tag vX.X.X
              │
              ▼  (tag triggers build)
build job × 3 (matrix)
├── macos-latest   ──► SparkleTrack-X.X.X.dmg
├── windows-latest ──► SparkleTrack-X.X.X-Setup.exe
└── ubuntu-latest  ──► SparkleTrack-X.X.X.AppImage
                       sparkletrack_X.X.X_amd64.deb
```

The key insight was separating tagging and building into two jobs with `if:` conditions. The `tag` job uses a PAT (Personal Access Token) instead of `GITHUB_TOKEN` to push the tag — because GitHub won't trigger downstream workflows from events caused by its own bot token. The `build` job only runs when a tag is pushed (`startsWith(github.ref, 'refs/tags/v')`).

<img src="/images/posts/sparkletrack-03.png" alt="SparkleTrack GitHub Actions release workflow — successful multi-platform build" width="100%" height="100%" />


---

**What I Learned**

**The "just use Express" instinct is wrong for desktop apps.** It feels familiar and works in dev, but creates a fragile runtime dependency that's hard to package correctly. IPC is the right abstraction because it's faster, simpler, and what Electron was designed for.

**Migrations are append-only history.** I hit a painful failure because I manually altered a table between Drizzle-generated migrations. Never touch migration files after they've been committed. If the schema is wrong, generate a new migration.

**`base: './'` in Vite is load-bearing for Electron.** Without it, built asset paths are absolute (`/assets/index.js`), which works for web but fails when loading via `file://` protocol in a packaged app.

**A PAT is required for bot-triggered workflow chaining.** GitHub's bot token can't trigger other workflows. If your CI creates a tag that should trigger a release build, that push must use a PAT.

---

**What's Next**

SparkleTrack works, ships, and installs cleanly on all three platforms. But it's version 1.x of course and that means there's a lot of road left.

- **Auto-updater** — check for updates on launch, prompt to install, no manual downloads
- **Milestones** — group issues with due dates and progress tracking
- **Issue relationships** — blocking/blocked-by between issues
- **Keyboard-first navigation** — full keyboard control without touching the mouse
- **Themes** — the pink aesthetic is very much mine; dark mode would make it usable by people with different taste
- **Data sync** — sync the SQLite file across machines via a lightweight cloud layer

<img src="/images/posts/sparkletrack-04.png" alt="SparkleTrack issue detail view — activity feed, labels, and comments" width="100%" height="100%" />

---

SparkleTrack started as a solution to my own chaos and ended up teaching me more about Electron internals, native module compilation, and CI/CD pipeline design than I expected. The irony of spending more time on the tooling than on the features is very on-brand for a hobby developer. I regret nothing.

Open source repo and release downloads at [github.com/chelseymachin/sparkletrack](https://github.com/chelseymachin/sparkletrack). Please poke around, steal the IPC migration pattern, or file an issue about SparkleTrack so I can SparkleTrack a fix for it.

---