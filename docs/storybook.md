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
- **`__BEACON_TOWER_ORIGIN__` is defined as `""`** — same convention as the Vitest run: no Tower
  backend. Components must not fetch in Storybook.
- **No `webflow` runtime.** `shared/ui` never touches it (verified). A logging no-op stub
  (`.storybook/webflow-stub.ts`) is installed so accidental calls in future feature-level stories
  fail soft instead of throwing `ReferenceError`. Stories needing real Designer data must mock the
  global in a story decorator.
- **App bootstrap is mirrored, app providers are not.** Preview replicates `src/index.tsx` side
  effects (`globals.css`, `injectBeaconAppBackgroundCssVars()`) and the app-level
  `TooltipProvider`. It deliberately does NOT mount `BeaconAppSettingsProvider` or the auth/site
  gates — those fetch Tower and require a Designer session on mount.
- **Theme** via `@storybook/addon-themes` toggling `dark`/`light` on `<html>` (same mechanism as
  the app's ThemeProvider; covers Radix portals). Dark is default.
- **Viewport** defaults to `Webflow panel (350×800)` — the size the app pins via
  `webflow.setExtensionSize`. Review layouts at that width.
- **`.storybook/preview.css`** relaxes the app's `html, body { overflow: hidden }` viewport lock so
  docs pages scroll.

## Adding stories

Follow `src/shared/ui/button.stories.tsx` (canonical pattern): CSF3, `Meta`/`StoryObj` from
`@storybook/react-vite`, `fn()` from `storybook/test` for handlers, title `UI/<ComponentName>`.
Autodocs is enabled globally — do not repeat the tag. Respect the UI Styling Ownership rule:
variants via component props only; wrappers carry layout-only classes.

Story files are excluded from Vitest coverage (`vite.config.ts`) and `storybook-static/` is
git-ignored.
