# Changesets

Changesets power versioning and changelogs for publishable packages in this monorepo.

Currently only `@codalyn/loadout` is published. Apps (flint, beacon, tower) are ignored.

Usage:

```bash
pnpm changeset           # author a changeset describing your change
pnpm version             # bump versions + write CHANGELOG (CI or local)
pnpm release             # build + publish to npm
```
