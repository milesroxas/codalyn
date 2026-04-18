# npm + jsDelivr CDN Deployment Guide

## Overview
This project automatically publishes compiled assets to npm registry on every push to `main` that modifies source files. jsDelivr automatically serves these packages, enabling seamless Webflow integration with auto-updating scripts.

## How It Works

### Automatic Deployment
The GitHub workflow (`.github/workflows/publish-jsdelivr.yml`) triggers when you push changes to:
- `src/**` - Source code
- `bin/**` - Build scripts
- `package.json` - Dependencies
- `pnpm-lock.yaml` - Lock file
- `tsconfig.json` - TypeScript config

The workflow:
1. Builds production assets (`pnpm build`)
2. Publishes package to npm registry (`npm publish`)
3. jsDelivr automatically mirrors the npm package within minutes

## Usage in Webflow

### Latest Version (Auto-updating)
Use this for development sites that should always get the latest updates:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/codalyn-loadout@latest/dist/index.js"></script>
<link href="https://cdn.jsdelivr.net/npm/codalyn-loadout@latest/dist/index.css" rel="stylesheet" type="text/css"/>
```

**Note:** The `type="module"` attribute is required because the build uses ESM format for code splitting.

### Pinned Version (Stable - Recommended)
Use semantic versions for version pinning (recommended for production sites):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/codalyn-loadout@1.0.0/dist/index.js"></script>
<link href="https://cdn.jsdelivr.net/npm/codalyn-loadout@1.0.0/dist/index.css" rel="stylesheet" type="text/css"/>
```

### Version Ranges
Use npm semver ranges for flexibility:

```html
<!-- Get latest 1.x version -->
<script type="module" src="https://cdn.jsdelivr.net/npm/codalyn-loadout@1/dist/index.js"></script>

<!-- Get latest 1.0.x patch version -->
<script type="module" src="https://cdn.jsdelivr.net/npm/codalyn-loadout@1.0/dist/index.js"></script>
```

### Webflow Global Custom Code Snippet

Use this snippet in Webflow Project Settings → Custom Code to auto-detect between localhost and CDN assets during development.

**Important Notes:**
- The toggle button **only appears when viewing on localhost** (e.g., `localhost:3005`)
- Toggle is **never shown** on production sites or Webflow designer
- localStorage is **automatically cleaned up** when not on localhost to prevent performance issues
- Use `?useLocal=1` query parameter for one-time testing without persistence

**Head Code (CSS loader)** - Copy this snippet from your terminal when running `pnpm dev`

**Before `</body>` Code (Toggle + JS loader)** - Copy this snippet from your terminal when running `pnpm dev`

The terminal will display both snippets with proper formatting when you start the dev server.

## Versioning Strategy

### Semantic Versioning
Follow semantic versioning for npm packages:
- `1.0.0` - Major release (breaking changes)
- `1.1.0` - Minor release (new features, backward compatible)
- `1.0.1` - Patch release (bug fixes)

### Creating a Release
Bump version after committing your changes:
```bash
# 1. Stage and commit your changes first
git add src/
git commit -m "feat: your feature description"

# 2. Bump version (creates a separate commit automatically)
pnpm version patch  # 1.0.0 → 1.0.1
pnpm version minor  # 1.0.0 → 1.1.0
pnpm version major  # 1.0.0 → 2.0.0

# 3. Push changes (workflow will auto-publish to npm)
git push origin main
```

**Important**: You must bump the version number before publishing. npm will reject attempts to publish over existing versions.

### Branch Strategy
- `main` - Latest stable code, auto-publishes to npm on push

## Naming Conventions

### Commit Messages
Use conventional commits for clarity:
- `feat:` - New feature
- `fix:` - Bug fix
- `chore:` - Maintenance (deps, config)
- `refactor:` - Code restructuring
- `docs:` - Documentation only
- `test:` - Test changes

Example:
```bash
git commit -m "feat: add carousel navigation controls"
git commit -m "fix: resolve mobile viewport overflow"
```

### File Structure
- `src/` - Source TypeScript/CSS
- `dist/` - Compiled output (auto-generated, published to npm only)
- `bin/` - Build scripts

## Best Practices

### Development Workflow
1. Create feature branch: `git checkout -b feature/carousel-controls`
2. Make changes and test locally: `pnpm dev`
3. Commit with conventional format: `git commit -m "feat: add carousel controls"`
4. Push and create PR: `git push origin feature/carousel-controls`
5. Merge to `main` after review
6. Bump version: `pnpm version patch/minor/major` (creates a commit automatically)
7. Push to trigger automatic npm publish: `git push origin main`

**Note**: Always bump the version after committing your changes. The `pnpm version` command automatically creates a new commit with the version change.

### Webflow Integration
1. **Development sites**: Use `@latest` for auto-updates
2. **Production sites**: Use `@1.0.0` pinned versions
3. **Flexible updates**: Use `@1` for latest 1.x version
4. Always use `type="module"` on script tags (required for code splitting)
5. Module scripts are automatically deferred, no need for `defer` attribute
6. Place CSS in `<head>`, scripts before `</body>`

### Cache Busting
jsDelivr automatically purges cache on new npm versions, but force update with:
```html
<!-- Add ?v=timestamp for immediate updates -->
<script type="module" src="https://cdn.jsdelivr.net/npm/codalyn-loadout@latest/dist/index.js?v=20251031"></script>
```

### Rollback Strategy
If a deployment breaks production:
```bash
# Option 1: Publish a new patch version with the fix
npm version patch
git push origin main

# Option 2: Point Webflow to previous working version
# Change @latest to @1.0.0 in Webflow embed
```

**Note:** npm packages cannot be unpublished after 72 hours. Always fix forward or pin to stable versions.

## CI/CD Details

### Workflow Triggers
- ✅ Push to `main` with source file changes
- ❌ Documentation-only changes (no trigger)

### Build Process
1. Checkout repository
2. Setup Node.js with npm registry authentication
3. Setup pnpm 10+
4. Install dependencies with frozen lockfile
5. Run production build
6. Publish to npm registry

### Permissions
The workflow uses npm's **Trusted Publishing** via OpenID Connect (OIDC), eliminating the need for npm tokens. Authentication happens automatically through GitHub Actions when:
- The workflow has `id-token: write` permission
- A trusted publisher is configured on npm for this repository
- npm is upgraded to the latest version (required for OIDC support)

## Monitoring

### Check Deployment Status
View workflow runs: https://github.com/milesroxas/codalyn-loadout/actions

### Verify npm Package
Check published versions: https://www.npmjs.com/package/codalyn-loadout

### Verify CDN Updates
jsDelivr mirrors npm within 1-2 minutes. Check:
```
https://cdn.jsdelivr.net/npm/codalyn-loadout@latest/dist/index.js
```

### Debugging
- Check GitHub Actions logs for build errors
- Verify package published to npm
- Test CDN URL directly in browser
- Use browser DevTools Network tab to verify loading

## Security

### Trusted Publishing Setup
This project uses **npm Trusted Publishing** for secure, tokenless authentication:

**How it works:**
- GitHub Actions authenticates to npm using OpenID Connect (OIDC)
- No npm tokens are stored in repository secrets
- Each publish includes cryptographically signed provenance attestation
- Provenance is published to Sigstore's transparency log

**Configuration:**
The trusted publisher is configured on npm with:
- **Publisher**: GitHub Actions
- **Organization/User**: `milesroxas`
- **Repository**: `codalyn-loadout`
- **Workflow filename**: `publish-jsdelivr.yml`
- **Environment name**: (blank)

**Benefits:**
- No token management or rotation needed
- Automatic expiration of credentials
- Built-in supply chain security via provenance
- Reduced risk of credential leaks

### Access Control
- Only repository maintainers can push to `main`
- npm validates workflow identity via OIDC before allowing publish
- Use branch protection rules for additional safety

## FAQ

**Q: How long until changes appear on Webflow?**
A: ~2-5 minutes (1-2 min GitHub Actions build + npm publish + 1-2 min jsDelivr sync)

**Q: Can I use this with a private npm package?**
A: Yes, but jsDelivr only works with public npm packages. For private packages, use a private CDN.

**Q: What if the build fails?**
A: Check GitHub Actions logs. The workflow won't publish to npm if the build fails.

**Q: Do I need to commit dist/ files?**
A: No! dist/ files are in `.gitignore` and only published to npm, never committed to git.

**Q: How do I set up npm publishing for a new package?**
A: Use npm Trusted Publishing (no tokens required):
1. Create package on npm and do initial manual publish with `npm publish --access public --otp=<code>`
2. Go to package settings → Publishing access → Add trusted publisher
3. Configure with repository details (see Security section above)
4. GitHub Actions will handle all future publishes automatically via OIDC
