# Beacon — Webflow Designer Extension

Asset tooling Designer Extension for Webflow. See the [Designer Extension docs](https://developers.webflow.com/designer/reference/introduction) for API reference.

Workspace setup, monorepo commands, and the shared Webflow extension bundle workflow are documented in the [repository root README](../../README.md).

## Internal docs

- [Image upload presets](./docs/image-upload-presets.md)
- [CMS slot image upload](./docs/cms-slot-image-upload.md)
- [Uninstall / cleanup](./docs/uninstall.md)
- [Rich-text editor design](../../docs/beacon-rich-text-editor.md)
- [Marketplace submission playbook](../../docs/webflow-marketplace/playbook.md) · [compliance record](../../docs/webflow-marketplace/compliance-record.md) — every review round, finding, fix and artifact hash

## Network egress (one call site)

Every request the extension makes leaves through `extensionFetch` in
[`src/shared/lib/extension-egress.ts`](./src/shared/lib/extension-egress.ts). It classifies the destination
before building a request and rejects with `EgressPolicyError` otherwise:

| Destination | Rule |
| --- | --- |
| Tower (first-party backend) | exact origin match against the origin baked at build (`__BEACON_TOWER_ORIGIN__`) |
| Webflow asset upload | HTTPS on `webflow.com` / `website-files.com` or an Amazon S3 endpoint host — the presigned `uploadUrl` Webflow hands back for the published-site runtime script |

`towerFetch` / `towerFetchWithRetry` (`src/shared/lib/tower-client.ts`) add the Designer-session bearer and 429
backoff on top of it; use those for Tower and never call `fetch` directly. The shipped CSP `connect-src` names the
same destinations. Webflow's App Review Preflight reports every bare `fetch(` in a bundle as "External API Calls",
so the release build pins the count to exactly one and a source sweep test fails on any other first-party call.
PostHog (opt-in telemetry) ships its own transport and is disclosed separately.

## Marketplace scanner shapes — do not add

The release build (`build:prod` / `build:preview`) fails on any of these anywhere in the compiled output, vendor code
included, because Webflow's static review scanner flags them regardless of reachability:

- a second bare `fetch(` or `new MutationObserver(` (the one observer is Lexical's contenteditable sync in the
  rich-text editor — see the JSDoc on `RichTextEditor`);
- `window.open(`, `postMessage(`, `http://` / `ws://` URLs (W3C namespaces exempt), `.innerHTML =` /
  `.outerHTML =` / `insertAdjacentHTML(` / `document.write(`;
- `?token=` / `&token=` query strings, `rrweb` / session-recording / `recorder`, `.toBlob(` / `toDataURL` /
  `getImageData`, any Sentry reference, `localhost` / `127.0.0.1` / placeholder domains, `sourceMappingURL`.

Do not write these tokens in comments either — the gates and the source sweep read raw text. Vendor libraries that
carry one are handled with a pnpm patch (`/patches`) or a strip rule in `scripts/vite-strip-dev-host-literals.mjs`,
never by a call-site workaround. Process: [submission playbook](../../docs/webflow-marketplace/playbook.md).

## Development

From the repository root: `pnpm app beacon dev`. From this directory: `pnpm dev`.

Runs the Vite dev server (port 1337) with the Webflow extension template injected. Use the printed URL as the "Development URL" in the Webflow Designer Apps panel.

## Build

From this directory: `pnpm build`, `pnpm build:prod`, or `pnpm build:dev`. From the repository root: `pnpm app beacon build`, `pnpm app beacon build:prod`, or `pnpm app beacon build:dev`. Details (shared CLI, output paths, release gates) are in the root README.

Submission builds: `CI=true BUILD_RECIPIENT=public pnpm build:prod` → `bundle/production/public/v<ver>_public_<stamp>.zip`
plus the private `.sourcemaps.zip` (submission form field only). `bundle/` is gitignored and auto-pruned after each
build: newest 2 builds stay, builds named in `docs/*.md` move to `bundle/archive/`, the rest are deleted — record an
uploaded zip's name (and sha256) in the compliance doc before building again.
