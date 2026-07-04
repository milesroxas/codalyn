# Storybook (Beacon)

Browser-viewable catalog of Beacon's UI so product designers and design engineers can review and
refine components without running the extension inside the Webflow Designer.

## Run

```bash
pnpm app beacon storybook                   # repo launcher (same UX as `pnpm app beacon dev`)
pnpm storybook                              # from repo root (turbo, builds workspace deps first)
pnpm --filter @codalyn/beacon storybook     # direct
pnpm --filter @codalyn/beacon storybook:build   # static build → apps/beacon/storybook-static
```

`storybook` uses the same dev harness as `dev` (`scripts/storybook.mjs` →
`runDevWithWorkspacePackages`): it builds `@codalyn/webflow-kit` / `@codalyn/observability` once,
then keeps their `tsc --watch` running so edits to package source hot-reload in Storybook.

## Publish (Chromatic)

```bash
pnpm chromatic    # from repo root — turbo builds workspace deps, then builds + uploads Storybook
```

Publishes the Beacon Storybook to Chromatic for hosted review and visual regression snapshots.
Beacon has its own Chromatic project; Tower will get a separate one.

- **Token** lives in `apps/beacon/.env` as `CHROMATIC_PROJECT_TOKEN` (gitignored; the chromatic
  CLI reads it via dotenv — see `.env.example`). Get it from the Chromatic project's Manage →
  Configure page.
- **Config** in `apps/beacon/chromatic.config.json`: points Chromatic at the `storybook:build`
  script (the CLI's default script name is `build-storybook`, which this repo doesn't use) and
  sets `storybookBaseDir` for monorepo-aware change detection. TurboSnap (`onlyChanged`) only
  snapshots stories whose dependency graph changed — `externals: ["packages/**"]` forces a full
  re-test when workspace package source changes, because Storybook consumes their built `dist/`
  and the bundle trace can't map dist files back to package source. `autoAcceptChanges: "main"`
  keeps main self-baselining so PR builds always diff against an accepted baseline.
- **Why turbo**: the `chromatic` turbo task declares `dependsOn: ["^build"]` so
  `@codalyn/webflow-kit` / `@codalyn/observability` have fresh `dist/` before the Storybook
  build — running the CLI bare in `apps/beacon` skips that.
- **CI**: `.github/workflows/chromatic.yml` publishes on PRs and pushes to main (secret
  `CHROMATIC_PROJECT_TOKEN`, already set on the repo). It checks out with `fetch-depth: 0`
  (baseline ancestry + TurboSnap), builds workspace deps via
  `turbo run build --filter=@codalyn/beacon^...`, then runs `chromaui/action` with
  `workingDir: apps/beacon`. `exitOnceUploaded: true` frees the runner after upload; the
  Chromatic GitHub integration posts UI Tests / UI Review checks on the PR itself.

## Architecture

Storybook lives in `apps/beacon/.storybook/`; stories are colocated with components
(`src/shared/ui/<name>.stories.tsx`).

Design decisions a reviewer should know:

- **Dedicated Vite config** (`.storybook/vite.config.ts`), not the app's `vite.config.ts`. The app
  config registers the Webflow Designer extension dev plugin — it injects Webflow's boot scripts
  (the `webflow` global) into served HTML and shapes build output for the extension bundle. Both
  are wrong for a standalone browser catalog. The Storybook config reproduces only the
  browser-relevant pieces (Tailwind v4 plugin, React plugin, `@` alias, `define` globals) and must
  be kept in sync with the app config when those change.
- **`__BEACON_TOWER_ORIGIN__` is defined as `"https://tower.mock"`** — a fake origin no server
  answers. MSW (`msw-storybook-addon`) intercepts every request to it; `.storybook/tower-mock.ts`
  provides per-persona handlers and a catch-all 404 for unmocked paths. This keeps
  `isTowerConfigured()` true so signed-in UI states are reachable, while the real
  `BeaconAppSettingsProvider` / Better Auth hooks run unmodified. The MSW service worker lives in
  `.storybook/public/` (extra `staticDirs` entry) so it never ships in the extension bundle.
- **No `webflow` runtime.** `shared/ui` never touches it (verified). A logging no-op stub
  (`.storybook/webflow-stub.ts`) is installed so accidental calls fail soft instead of throwing
  `ReferenceError`. Feature-level stories layer canned per-story returns over it (see below);
  anything not overridden logs and resolves `null`.
- **App bootstrap is mirrored, app providers are opt-in.** Preview replicates `src/index.tsx` side
  effects (`globals.css`, `injectBeaconAppBackgroundCssVars()`) and the app-level
  `TooltipProvider`. `BeaconAppSettingsProvider`, the router, and the app-shell contexts are
  mounted only for stories that opt in via `beaconScreen()` — plain UI stories keep rendering
  provider-free with zero fetches.
- **Theme** via `@storybook/addon-themes` toggling `dark`/`light` on `<html>` (same mechanism as
  the app's ThemeProvider; covers Radix portals). Dark is default.
- **Viewport** defaults to `Webflow panel (350×800)` — the size the app pins via
  `webflow.setExtensionSize`. Review layouts at that width.
- **`.storybook/preview.css`** relaxes the app's `html, body { overflow: hidden }` viewport lock so
  docs pages scroll, and pads `#storybook-root` past the header band baked into the top of the
  app background art (the real app hides that band behind the opaque app header; Storybook
  renders no header, so without the offset stories draw on top of it).

## Adding stories

Follow `src/shared/ui/button.stories.tsx` (canonical pattern): CSF3, `Meta`/`StoryObj` from
`@storybook/react-vite`, `fn()` from `storybook/test` for handlers, title `UI/<ComponentName>`.
Autodocs is enabled globally — do not repeat the tag. Respect the UI Styling Ownership rule:
variants via component props only; wrappers carry layout-only classes.

## Feature-level stories (app screens)

Screens that read Tower state or the Designer runtime opt into the app-shell harness with one
parameters call (see `src/app/ui/Header.stories.tsx` / `beacon-home-screen.stories.tsx`):

```tsx
import { beaconScreen } from "~sb/beacon-app";
import { fakePage } from "~sb/webflow-fixtures";

export const TeamAdmin: Story = { parameters: beaconScreen("teamAdmin") };
export const OnCmsTemplate: Story = {
  parameters: beaconScreen("teamAdmin", { page: fakePage("cms"), route: "/home" }),
};
```

`beaconScreen(persona, opts)` bundles everything one coherent app state needs:

- **Personas** (`.storybook/tower-mock.ts`): `guest`, `freeUser`, `teamEditor`, `teamAdmin`.
  Each is a matched set of MSW handlers (Better Auth session, `/api/v1/beacon/settings`
  envelope), a bearer token seeded into localStorage, and Webflow sites that authorize the fake
  Designer site.
- **Designer scene** (`.storybook/webflow-fixtures.ts`): canned `getCurrentPage`/`getSiteInfo`
  returns layered over the stub. Override per story via `{ page: fakePage("cms") }` or
  `{ webflow: { getAllElements: async () => [...] } }`. Fixtures implement only the methods
  storied screens call — extend them when a story visibly needs a method, not before.
- **App providers** (`.storybook/beacon-app.tsx`): the `withBeaconApp` decorator mirrors
  `src/app/app.tsx` nesting (router → settings → CMS-template-page → nav history → leave guard)
  for opted-in stories only.

Conventions: title `App/<ScreenName>`, `layout: "fullscreen"` for screens. Prefer storying the
presentational layer — title `CmsSlots/<Component>` / `ImageEditor/<Component>`, plain props, no
harness import (these components are context-free by design) — and keep screen-level stories to
a persona/state matrix like Home's. Sidebar order: Overview → App → CmsSlots → ImageEditor → UI.

Caveat: Better Auth caches its session in a module-level store; if a persona looks stale after
switching stories, reload the preview iframe.

Story files are excluded from Vitest coverage (`vite.config.ts`) and `storybook-static/` is
git-ignored.
