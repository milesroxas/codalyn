# Codalyn local rules that sit on top of the vendored Webflow skills

`webflow-app-preflight` and `webflow-app-review-remediation` are vendored unmodified from Webflow
(see `PROVENANCE.txt`; `shasum -a 256 -c SHA256SUMS.txt` must keep passing). They describe review
expectations, not this repo's layout. Repo-specific rules live beside them and apply whenever those
skills lead to a build, a package or an upload.

## Build distribution lanes — `codalyn-release-lanes`

`apps/beacon/bundle/production/public/` is the **Webflow Marketplace** lane. Only the `.zip` +
`.sourcemaps.zip` pair built for an actual App Review submission may be in it, and only
`pnpm --filter beacon build:marketplace` / `BUILD_PURPOSE=marketplace` writes there. Every internal
review, internal-testing publish, beta, demo or smoke-test build goes to `bundle/<channel>/internal/`
or another named recipient.

Never pass `BUILD_RECIPIENT=public`, never hand-place a file in the public folder, never split a
build's source-map zip from its bundle. If the intent is not stated, it is internal.

Full rule: [`codalyn-release-lanes/SKILL.md`](codalyn-release-lanes/SKILL.md) ·
`.cursor/rules/bundle-distribution-lanes.mdc` · `docs/webflow-marketplace/playbook.md` § A3.
