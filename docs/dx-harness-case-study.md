# Building a Developer Experience Harness

_A case study on the TUI and scripts I built to make working in the Codalyn monorepo actually pleasant._

---

## Introduction

Codalyn is a pnpm + Turborepo monorepo with three apps (Flint, Beacon, Tower) and a few shared packages. Two of those apps are Webflow Designer Extensions, one is a Next.js dashboard, and they all lean on the same shared code. That's a lot of moving parts for one person to keep straight.

So I built a "harness" — not one big tool, but a small, layered set of scripts and an interactive terminal UI that sit between me and the messy commands underneath. The goal was simple: make the right thing the easy thing. Type one obvious command, get a guided, safe, repeatable result.

This is the story of what hurt, what I wanted instead, what I actually built, and what changed.

---

## Challenge / Problem

Early on, day-to-day work in the repo meant memorizing a lot of fiddly ceremony. A few things kept biting me:

- **Shipping an extension was a ritual, not a command.** Building a Webflow extension bundle meant remembering to typecheck, run tests, `vite build` with the _correct_ `--mode`, run `webflow extension bundle`, move the zip somewhere sensible, and hand-set env vars for the recipient and Tower origin. Miss one step and you'd ship a broken or misconfigured bundle without knowing.
- **Wrong-environment builds were terrifyingly easy.** Beacon bakes a Tower backend URL into its bundle. Nothing stopped me from shipping a "production" build quietly pointed at `localhost` or the wrong host.
- **The monorepo made you `cd` everywhere.** Half the commands only worked from an app folder, the other half from the root. Constant context-switching, constant "wait, where am I?"
- **Shared packages went stale during dev.** Editing `@codalyn/webflow-kit` while running an app's dev server did nothing until I manually rebuilt its `dist/`. Cue ten minutes of "why isn't my change showing up."
- **The database was a loaded gun.** Migrations and resets meant pasting raw connection strings around, with real risk of running a destructive command against the wrong database.

None of these were hard problems individually. Together, they were a tax on every single task — and exactly the kind of thing you forget a step of at 5pm on a Friday.

---

## Vision

I wanted the repo to feel like it was on my side. A few principles guided it:

- **One obvious command per job.** No cheat sheet required.
- **Make mistakes hard, not just discouraged.** Guardrails in code beat "remember to be careful."
- **Guide me through decisions instead of making me memorize flags.** Prompt for the choices that matter; default the rest.
- **Trust, but verify.** If the tool says it shipped a production build, prove the production markers are actually in the artifact.
- **Stay lightweight.** No heavy CLI framework. Small scripts I can read in one sitting.

Basically: turn tribal knowledge into tooling.

---

## Implementation

The harness came together as a few focused pieces.

### The build TUI

The centerpiece is an interactive terminal UI for building and distributing extension bundles (`scripts/build-cli.mjs`), built with `@clack/prompts` and `picocolors`. Run `pnpm app beacon build` and it walks you through it:

1. **Pick a channel** — production, preview, or development (with hints showing which Tower host each maps to).
2. **Pick a recipient** — choose an existing distribution target or create a new one, so different customers get their own versioned folder.
3. **Confirm a summary**, then watch a progress bar move through the pipeline.

Under the hood, every build runs the same gated pipeline, in order:

```
lint:all → test:run → clean dist → vite build → verify markers → webflow bundle → verify zip → archive
```

Two design decisions matter here. First, **quality gates live inside the build** — you can't skip lint, typecheck, or tests on the way to an artifact. Second, **build markers are treated as a contract**: after the build, the tool greps the compiled JS _and_ the final zip to confirm the version, recipient, and (for Beacon) the correct Tower origin are actually baked in. If they're not, it fails loudly instead of shipping something wrong.

It also runs headless. In CI or any non-TTY environment it skips the prompts, defaults to the production channel, and reads the recipient from an env var — same pipeline, no babysitting.

### The `pnpm app` launcher

A tiny 22-line wrapper (`scripts/app.mjs`) kills the `cd` dance. From anywhere in the repo:

```bash
pnpm app tower dev
pnpm app beacon build:prod
pnpm app tower db:reset:local -- --confirm
```

It just expands `tower` → `@codalyn/tower` and forwards everything to the right workspace. Small, but I use it constantly.

### The dev harness

`scripts/workspace-package-watch.mjs` fixes the stale-package problem. When you start an app's dev server, it first builds the shared packages once, then keeps a `tsc --watch` running for each of them alongside the app — and cleanly tears everything down on Ctrl-C. Edit a shared package, see it live. No manual rebuilds.

### Database safety scripts

Tower's DB scripts (`db-env.mjs`, `dev.mjs`, and friends) replace raw connection strings with named targets like `local`, `dev`, `preview`, and `prod`. On top of that:

- Dev flat-out **refuses to run against the production database**.
- Destructive commands like `db:reset:local` require an explicit `--confirm` and only run against localhost.
- It checks the dev port isn't already taken before starting.
- Migration journal/snapshot integrity is verified so hand-edited migration metadata can't slip through.

The connection string never leaves the resolver.

---

## Results

The harness turned a pile of error-prone rituals into a handful of commands I actually trust:

- **Shipping an extension is now one guided command** instead of a five-step checklist — and it's impossible to ship an unlinted, untested, or wrong-host bundle, because the pipeline verifies its own output.
- **Environment mistakes are caught before distribution**, not discovered by a confused user later.
- **`cd` friction is basically gone.** Everything runs from the repo root with a consistent `pnpm app <name> <cmd>` shape.
- **Shared-package edits are instant during dev**, so no more "why isn't my change showing up" detours.
- **The database feels safe.** Named targets plus confirmation gates removed a whole category of "oh no" moments.

The bigger win is invisible: the knowledge that used to live in my head now lives in the tooling. New work — or a future me who's forgotten the details — falls into the pit of success by default. That's the whole point of a good harness: it makes the correct path the path of least resistance.
