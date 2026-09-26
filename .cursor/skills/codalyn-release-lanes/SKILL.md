---
name: codalyn-release-lanes
description: Codalyn's rule for where a Webflow extension build is allowed to land. Use whenever building, rebuilding, packaging, uploading, publishing or preparing a Beacon or Flint bundle — including any step of the Marketplace submission runbook, any rebuild during a review-remediation loop, and any internal review, beta, demo or smoke-test build. Decides internal vs public before the build runs; apply it before running webflow-app-preflight or webflow-app-review-remediation packaging steps.
---

# Codalyn build distribution lanes

Repo-local rule. It sits on top of `webflow-app-preflight` and `webflow-app-review-remediation`,
which are vendored, unmodified, and say nothing about this repo's folder layout.

## The rule

Extension builds land in `apps/<app>/bundle/<channel>/<recipient>/`. The **recipient folder is the
distribution lane**, and the lanes are not interchangeable.

| Lane | Folder | Contents |
| --- | --- | --- |
| **Marketplace (public)** | `bundle/production/public/` | **Only** the `.zip` + `.sourcemaps.zip` pair built for an actual Webflow App Review submission |
| **Internal** | `bundle/<channel>/internal/`, or any other recipient name | Every internal review, internal-testing publish, beta, demo and smoke-test build |

Decide the lane **before** you build, and say which one you are in when you report the result.

## Commands

```bash
# Marketplace submission artifact — the ONLY thing that writes to bundle/production/public/
pnpm --filter beacon build:marketplace
CI=true BUILD_PURPOSE=marketplace pnpm --filter beacon build:prod   # non-interactive equivalent

# Everything else (default recipient: internal)
pnpm --filter beacon build:prod        # → bundle/production/internal/
pnpm --filter beacon build:preview     # → bundle/preview/internal/
pnpm --filter beacon build:dev         # → bundle/development/internal/
BUILD_RECIPIENT=beacon-demo pnpm --filter beacon build:prod   # named internal target
```

## Never

- Never pass `BUILD_RECIPIENT=public`. It is refused; `BUILD_PURPOSE=marketplace` is the only way in.
- Never copy, move or rename an artifact into `bundle/production/public/`, and never delete or
  overwrite what is already there to make room.
- Never create a `public` folder under the `preview` or `development` channel.
- Never separate a build's `.sourcemaps.zip` from its `.zip`. They are one artifact pair in one lane;
  the source-map zip is private submission-form input and never ships inside the bundle.
- Never infer the purpose from the channel, from a folder that already exists, or from a runbook
  command that used `public` for an earlier round. **If the intent is not stated, it is internal.**
  If a submission really is intended, say so and confirm before building into the public lane.

## Why

`v0.1.0_public_<stamp>.zip` and `v0.1.0_internal_<stamp>.zip` look identical in a file picker, and
both the submission form and the Workspace *Publish new version* dialog take a file path. A
dev-intent artifact in the public folder is one click from entering App Review, and a dev build in
review costs a full round (10–15 business days).

## Not an exception

`docs/webflow-marketplace/SUBMIT.md` Step 3 publishes the **submission** zip — the one from
`bundle/production/public/` — with the Workspace *"Publish for internal testing"* radio. That is
deliberate: Steps 3–5 must exercise the exact artifact that then goes to review. The lane governs
which build lands in which folder, not which distribution radio is selected in Webflow.

## Enforcement (do not work around it)

`scripts/build-cli.mjs` fails before lint when:

- purpose and target disagree (`assertDistributionTarget`);
- a `public` folder exists outside the production channel (`assertNoMisplacedMarketplaceBundles`);
- `public` is typed at the recipient prompt (`validateRecipientName`).

Guards are unit-tested in `apps/beacon/scripts/release-build-gates.test.mjs`,
`describe("distribution lane (internal review vs Webflow Marketplace)")`. If a guard fires, fix the
command — do not edit the guard, and do not place the file by hand.

## Reference

- `.cursor/rules/bundle-distribution-lanes.mdc` — the always-on rule text
- `docs/webflow-marketplace/playbook.md` § A3 — build step in the submission runbook
- `docs/webflow-marketplace/SUBMIT.md` — the current round's paste sheet and step order
