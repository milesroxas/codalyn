# Development Workflow Guide

Quick reference for working with this npm + jsDelivr integrated Webflow project.

## TL;DR - The 4 Commands You Need

```bash
pnpm dev          # 1. Test locally at localhost:3005
pnpm check:fix    # 2. Fix code quality issues
git add src/      # 3. Stage your changes
git commit -m "feat: description"  # 4. Commit
pnpm push         # 5. Push → GitHub Actions publishes to npm → jsDelivr syncs
```

**Never commit `dist/` files!** They're published to npm only, not committed to git.

---

## How npm + jsDelivr Deployment Works

**Important:** jsDelivr automatically mirrors npm packages. You never need to manually upload files!

When you push to GitHub:
1. GitHub Actions builds your `dist/` files automatically
2. GitHub Actions publishes package to npm registry
3. jsDelivr automatically syncs from npm within minutes
4. Your changes go live at: `https://cdn.jsdelivr.net/npm/codalyn-loadout@latest/dist/index.js`

## Simple 4-Step Workflow

### Step 1: Make Changes

```bash
# Edit files in src/
pnpm dev  # Test locally at localhost:3005
```

### Step 2: Check Code Quality

```bash
pnpm check:fix  # Auto-fix linting and formatting
```

### Step 3: Commit Your Changes

```bash
# Stage ONLY source files (NOT dist/)
git add src/
git add bin/              # If you changed build scripts
git add package.json      # If you changed dependencies

# Commit with conventional commit message
git commit -m "feat: your feature description"
```

### Step 4: Push to GitHub

```bash
pnpm push
```

**That's it!** GitHub Actions will:
- Build production files
- Publish package to npm registry
- jsDelivr automatically mirrors from npm

---

## What `pnpm push` Actually Does

```bash
# Under the hood, it runs:
git restore dist/                    # Discard local builds (not tracked anyway)
git pull --rebase origin main        # Get latest changes
git push origin main                 # Push your changes
```

This ensures you're always synced with the remote before pushing.

## Complete Example Session

```bash
# 1. Make changes
# Edit src/features/carousel/model.ts

# 2. Test locally
pnpm dev
# Test in Webflow with localhost:3005

# 3. Code quality check
pnpm check:fix

# 4. Commit your changes
git add src/
git commit -m "feat: add breakpoint configuration to carousel"

# 5. Bump version (creates a new commit)
pnpm version patch

# 6. Push
pnpm push

# 7. Wait 2-5 minutes, then test production:
# https://cdn.jsdelivr.net/npm/codalyn-loadout@latest/dist/index.js
# Hard refresh browser (Cmd+Shift+R)
```

## Webflow Integration

### Webflow Global Custom Code

- Copy the **head** and **before `</body>`** snippets from your terminal when running `pnpm dev`
- Add these snippets to Webflow Project Settings → Custom Code
- The toggle button **only appears when viewing on localhost** (not on Webflow designer or production sites)
- localStorage is automatically cleaned up when not on localhost to prevent performance issues

## Important Rules

### ✅ DO

- Work directly on `main` branch (no feature branches needed for solo work)
- Always use `pnpm push` instead of `git push`
- Only commit `src/`, `bin/`, `docs/`, `package.json` files
- Test locally with `pnpm dev` before pushing
- Run `pnpm check:fix` before committing
- Use conventional commit messages (feat:, fix:, chore:, docs:)

### ❌ DON'T

- Don't manually commit `dist/` files (they're published to npm, not git)
- Don't use `git push` directly (use `pnpm push` instead)
- Don't edit `dist/` files directly
- Don't skip `pnpm check:fix` before committing
- Don't manually upload files to jsDelivr (it mirrors npm automatically!)

## Troubleshooting

### "Cannot pull with rebase: You have unstaged changes"

**Problem:** You have uncommitted changes when trying to push.

**Solution:**
```bash
# Option 1: Commit or restore the changes first
git status                    # See what changed
git restore dist/            # If it's dist/, discard it
git add docs/                # If it's source files, commit them

# Then try again
pnpm push
```

### "Your branch has diverged"

**Problem:** Your local branch and remote have different commits.

**Solution:**
```bash
pnpm push  # This handles it automatically with --rebase
```

### "Unstaged changes in dist/"

**Problem:** You ran `pnpm dev` or `pnpm build` locally, creating dist/ files.

**Solution:**
```bash
git restore dist/            # Discard local builds (they're not tracked)
pnpm push                    # dist/ is in .gitignore anyway
```

**Note:** dist/ files are in `.gitignore` and never committed to git.

### Changes Not Appearing in Webflow

1. Check GitHub Actions: https://github.com/milesroxas/codalyn-loadout/actions
2. Verify the build and npm publish succeeded
3. Check npm package: https://www.npmjs.com/package/codalyn-loadout
4. Wait 2-5 minutes for jsDelivr to sync from npm
5. Hard refresh in browser (Cmd+Shift+R / Ctrl+Shift+R)
6. Check the CDN URL directly in browser

### Build Failed on GitHub Actions

1. Check the Actions log for errors
2. Run `pnpm build` locally to reproduce
3. Fix the issue in src/
4. Push again with `pnpm push`

## Version Management

### Creating a New Release

```bash
# 1. Commit your changes first
git add src/
git commit -m "feat: your feature description"

# 2. Bump version (creates a separate commit automatically)
pnpm version patch   # 1.0.0 → 1.0.1
pnpm version minor   # 1.0.0 → 1.1.0
pnpm version major   # 1.0.0 → 2.0.0

# 3. Push to trigger npm publish
pnpm push

# Update Webflow to use specific version:
# @latest → @1.0.1
```

**Important**: Always bump the version after committing your changes. npm will reject attempts to publish over existing versions.

### Semantic Versioning

- `1.0.0` - Major (breaking changes)
- `1.1.0` - Minor (new features, backward compatible)
- `1.0.1` - Patch (bug fixes)

## Quick Commands Reference

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start local dev server |
| `pnpm build` | Build production locally (for testing) |
| `pnpm check` | Run linting and type checking |
| `pnpm check:fix` | Auto-fix code quality issues |
| `pnpm push` | Smart push with auto-sync |
| `pnpm test` | Run Playwright tests |

## File Structure & What to Commit

```
src/              → ✅ Commit this (your source code)
bin/              → ✅ Commit this (build scripts)
docs/             → ✅ Commit this (documentation)
package.json      → ✅ Commit this (dependencies)
pnpm-lock.yaml    → ✅ Commit this (lock file)

dist/             → ❌ Never commit (published to npm only, in .gitignore)
node_modules/     → ❌ Never commit (gitignored)
```

**Remember:** GitHub Actions automatically builds and publishes `dist/` to npm. You only commit source code!

## Getting Help

- **Build Issues**: Check GitHub Actions logs
- **Type Errors**: Run `pnpm check` locally
- **Webflow Issues**: Verify CDN URL in browser Network tab
- **Git Conflicts**: Use `pnpm push` instead of `git push`
