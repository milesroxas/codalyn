# Codalyn Loadout - Webflow Script Development Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Build System](#build-system)
4. [Development Workflow](#development-workflow)
5. [Production Deployment](#production-deployment)
6. [Code Quality & Linting](#code-quality--linting)
7. [Testing](#testing)
8. [Project Structure](#project-structure)
9. [Configuration Files](#configuration-files)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

---

## Project Overview

**Codalyn Loadout** is a professional development environment optimized for creating, testing, and deploying custom JavaScript/TypeScript scripts that embed into Webflow sites. This project provides a complete build pipeline that compiles TypeScript code into production-ready JavaScript bundles.

### Purpose

This codebase serves as a development framework for building scripts that will be:
1. Compiled and bundled using esbuild
2. Hosted on a production domain
3. Embedded into Webflow sites via `<script>` tags
4. Executed within the Webflow runtime environment

### Key Features

- **TypeScript Development**: Write type-safe code with full IDE support
- **Hot Reload Development**: Instant browser refresh on file changes
- **Production Optimization**: Minified, bundled output for production
- **Path Aliases**: Clean import statements using custom path aliases
- **Quality Assurance**: Integrated linting and formatting with Biome, plus TypeScript type checking
- **End-to-End Testing**: Playwright integration for browser testing
- **Webflow Integration**: Built-in patterns for Webflow API interaction

---

## Architecture

### Technology Stack

| Tool | Purpose | Version |
|------|---------|---------|
| **TypeScript** | Type-safe JavaScript development | ^5.7.3 |
| **esbuild** | Ultra-fast JavaScript bundler | ^0.24.2 |
| **Biome** | Fast, all-in-one formatter and linter | 2.2.6 |
| **Playwright** | End-to-end browser testing | ^1.50.1 |
| **pnpm** | Fast, disk space efficient package manager | >=10 |

### Build Pipeline Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     SOURCE CODE                              │
│                   (src/**/*.ts)                              │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                  TYPESCRIPT COMPILER                         │
│            (Type checking & transpilation)                   │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                     ESBUILD BUNDLER                          │
│  • Bundle dependencies                                       │
│  • Tree shake unused code                                    │
│  • Minify (production only)                                  │
│  • Generate sourcemaps (development only)                    │
│  • Inject live reload (development only)                     │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    OUTPUT FILES                              │
│                    (dist/*.js)                               │
│                                                              │
│  Development: http://localhost:3005/index.js                │
│  Production: https://yourdomain.com/dist/index.js           │
└─────────────────────────────────────────────────────────────┘
```

---

## Build System

### Core Build Configuration (`bin/build.js`)

The build system is powered by esbuild and configured through a custom build script that handles both development and production environments.

#### Configuration Variables

```javascript
// Output Configuration
const BUILD_DIRECTORY = "dist";
const PRODUCTION = process.env.NODE_ENV === "production";

// Entry Points
const ENTRY_POINTS = ["src/index.ts"];

// Development Server Configuration
const LIVE_RELOAD = !PRODUCTION;
const SERVE_PORT = 3005;
const SERVE_ORIGIN = `http://localhost:${SERVE_PORT}`;
```

#### Build Context

The build system creates an esbuild context with the following configuration:

```javascript
{
  bundle: true,                    // Bundle all dependencies
  entryPoints: ENTRY_POINTS,      // Source files to build
  outdir: BUILD_DIRECTORY,        // Output directory
  minify: PRODUCTION,             // Minify in production only
  sourcemap: !PRODUCTION,         // Sourcemaps in development only
  target: PRODUCTION ? "es2020" : "esnext",  // ES target
  inject: LIVE_RELOAD ? ["./bin/live-reload.js"] : undefined,  // Live reload injection
  define: {
    SERVE_ORIGIN: JSON.stringify(SERVE_ORIGIN)  // Global constants
  }
}
```

#### Build Modes

##### Development Mode (`pnpm dev`)

**Behavior:**
- Watches source files for changes
- Automatically rebuilds on file save
- Serves files via local server at `http://localhost:3005`
- Includes live reload functionality
- Generates sourcemaps for debugging
- Uses `esnext` target for modern browsers

**How It Works:**

1. **File Watching**: esbuild watches all TypeScript files and rebuilds on changes
2. **Local Server**: Serves built files from the `dist` directory
3. **Live Reload**: Injects a special script that listens to esbuild's SSE endpoint
4. **Auto Refresh**: Browser automatically reloads when files change

**Console Output:**

The development server displays two formatted code snippets:
1. **For `<head>`**: Complete CSS loading script with localhost/CDN fallback
2. **Before `</body>`**: Toggle button + JS loading script with localhost/CDN fallback

These snippets include:
- Automatic localhost detection
- localStorage cleanup when not on localhost
- Toggle button (only visible on localhost)
- CDN fallback if localhost is unavailable

##### Production Mode (`pnpm build`)

**Behavior:**
- Single build execution
- Minifies all JavaScript code
- No sourcemaps
- No live reload injection
- Uses `es2020` target for broader browser support
- Optimizes bundle size

**Output:**
- Creates production-ready files in the `dist/` directory
- Files are ready to be deployed to your production domain

---

### Live Reload System (`bin/live-reload.js`)

**Purpose**: Automatically reloads the browser when source files change during development.

**Implementation:**

```javascript
new EventSource(`${SERVE_ORIGIN}/esbuild`).addEventListener("change", () =>
  location.reload()
);
```

**How It Works:**

1. esbuild exposes a Server-Sent Events (SSE) endpoint at `/esbuild`
2. The live reload script creates an EventSource connection
3. When files are rebuilt, esbuild sends a "change" event
4. The browser receives the event and reloads the page

**Important Notes:**
- Only injected in development mode
- Uses the `SERVE_ORIGIN` global constant defined during build
- Requires the development server to be running

---

### Building Multiple Files

You can configure multiple entry points to build separate scripts for different pages or functionalities.

**Example:**

```javascript
// bin/build.js
const ENTRY_POINTS = [
  'src/index.ts',           // Main script
  'src/home/index.ts',      // Home page specific
  'src/contact/form.ts',    // Contact form handler
  'src/utils/analytics.ts'  // Analytics tracking
];
```

**Output:**
```
dist/
  ├── index.js
  ├── home/
  │   └── index.js
  ├── contact/
  │   └── form.js
  └── utils/
      └── analytics.js
```

**Webflow Integration:**

```html
<!-- Main script on all pages -->
<script defer src="https://yourdomain.com/dist/index.js"></script>

<!-- Home page only -->
<script defer src="https://yourdomain.com/dist/home/index.js"></script>

<!-- Contact page only -->
<script defer src="https://yourdomain.com/dist/contact/form.js"></script>
```

---

### CSS Support

The build system also supports CSS files as entry points.

**Method 1: Direct Entry Point**

```javascript
const ENTRY_POINTS = [
  'src/index.ts',
  'src/styles/main.css'  // CSS entry point
];
```

**Method 2: Import in TypeScript**

```typescript
// src/index.ts
import './styles/main.css';
```

**Output:**
- Generates minified CSS files in the `dist` directory
- Available at `http://localhost:3005/index.css` in development

**Webflow Integration:**

```html
<link href="https://yourdomain.com/dist/styles/main.css" rel="stylesheet" type="text/css"/>
```

---

## Development Workflow

### Initial Setup

1. **Install Dependencies:**
   ```bash
   pnpm install
   ```

2. **Install Playwright Browsers (if testing):**
   ```bash
   pnpm playwright install
   ```

3. **Open the Workspace:**
   ```bash
   # Open the workspace file in VS Code for Biome-specific settings
   code codalyn-loadout.code-workspace
   ```

4. **Install Recommended VSCode Extension:**
   - Biome (biomejs.biome)

### Development Cycle

1. **Start Development Server:**
   ```bash
   pnpm dev
   ```

2. **View Served Files:**
   The console will display a table with:
  - File locations (e.g., `http://localhost:3005/index.js`)
   - Import suggestions (ready-to-use script tags)

3. **Add Webflow Custom Code Snippets:**
   - Go to your Webflow project
   - Navigate to Project Settings > Custom Code
   - Copy the **head** and **before `</body>`** snippets from your terminal (displayed when running `pnpm dev`)
   - The toggle button will **only appear when viewing on localhost** (not on Webflow designer or production)

4. **Develop Your Code:**
   - Edit files in the `src/` directory
   - Browser automatically reloads on save
   - Check console for any errors

5. **Code Quality Checks:**
   ```bash
   # Lint only
   pnpm lint
   
   # Lint and auto-fix
   pnpm lint:fix
   
   # Format code
   pnpm format
   
   # Full check (lint + format + type check)
   pnpm check
   
   # Full check with auto-fix
   pnpm check:fix
   ```

6. **Run Tests:**
   ```bash
   # Headless mode
   pnpm test
   
   # UI mode (visual)
   pnpm test:ui
   ```

---

## Production Deployment

### Building for Production

1. **Create Production Build:**
   ```bash
   pnpm build
   ```

2. **Verify Output:**
   - Check the `dist/` directory
   - Verify all expected files are present
   - Files should be minified (single line)

### Deployment Steps

#### Step 1: Host the Files

You need to host your compiled JavaScript files on a public domain. Options include:

- **Custom Server**: Upload to your own web server
- **CDN**: Use services like Cloudflare, AWS CloudFront
- **Static Hosting**: Vercel, Netlify, GitHub Pages
- **Cloud Storage**: AWS S3, Google Cloud Storage

**Example Structure:**
```
https://yourdomain.com/
  └── dist/
      ├── index.js
      └── index.js.map (optional)
```

#### Step 2: Update Webflow

1. **Remove Development Script:**
   - Remove the localhost script tag from Webflow

2. **Add Production Script:**
   ```html
   <script defer src="https://yourdomain.com/dist/index.js"></script>
   ```

3. **Script Location Options:**
   - **Site-wide**: Project Settings > Custom Code > Footer Code
   - **Page-specific**: Page Settings > Custom Code
   - **Before `</body>`**: Recommended for most cases

4. **Publish Webflow Site:**
   - Publish your Webflow site
   - Test thoroughly on the live site

#### Step 3: Verify Deployment

1. **Open Browser DevTools:**
   - Check Console for errors
   - Check Network tab to verify script loads
   - Verify script functionality

2. **Test on Multiple Devices:**
   - Desktop browsers (Chrome, Firefox, Safari)
   - Mobile devices
   - Different screen sizes

### Updating Production Scripts

When you make changes:

1. Build new version: `pnpm build`
2. Upload new files to your hosting
3. Clear browser cache or use cache busting:
   ```html
   <script defer src="https://yourdomain.com/dist/index.js?v=1.0.1"></script>
   ```
4. Webflow will automatically use the new script (no re-publish needed if using same URL)

---

## Code Quality & Linting

### Biome

**Purpose**: Fast, all-in-one linter and formatter for TypeScript projects.

**Configuration**: `biome.json`

```json
{
  "$schema": "https://biomejs.dev/schemas/2.2.6/schema.json",
  "vcs": {
    "clientKind": "git",
    "enabled": true,
    "useIgnoreFile": true
  },
  "files": {
    "ignoreUnknown": false
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingCommas": "es5",
      "semicolons": "always",
      "arrowParentheses": "always"
    }
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  }
}
```

**Key Rules Enforced:**

1. **Node.js Import Protocol**: Use `node:` prefix for built-in modules
   ```typescript
   // ❌ Bad
   import { readFileSync } from "fs";
   
   // ✅ Good
   import { readFileSync } from "node:fs";
   ```

2. **Organize Imports**: Automatically sorts imports
   - Node.js built-ins first
   - External packages second
   - Local imports last

3. **Callback Return Values**: Ensure callbacks return proper values
   ```typescript
   // ❌ Bad
   array.map((item) => {
     if (condition) return;
     return item;
   });
   
   // ✅ Good
   array.map((item) => {
     if (condition) return undefined;
     return item;
   });
   ```

**Usage:**
```bash
# Lint only
pnpm lint

# Lint and auto-fix
pnpm lint:fix

# Format only
pnpm format

# Full check (lint + type check)
pnpm check

# Full check with auto-fix
pnpm check:fix
```


### TypeScript Type Checking

**Purpose**: Catch type errors before runtime.

**Usage:**
```bash
pnpm check  # Biome + TypeScript check
```

**Note**: Type checking is integrated with Biome checks. The build process is handled by esbuild.

---

## Testing

### Playwright Configuration

**Purpose**: End-to-end browser testing to ensure your scripts work correctly in real browser environments.

**Configuration**: `playwright.config.ts`

**Key Settings:**

```typescript
{
  testDir: "./tests",
  timeout: 30000,              // 30 second timeout per test
  fullyParallel: true,         // Run tests in parallel
  projects: [                  // Test on multiple browsers
    { name: "chromium" },
    { name: "firefox" },
    { name: "webkit" }
  ],
  webServer: {                 // Auto-start dev server
    command: "pnpm dev",
    port: 3000,
    reuseExistingServer: true
  }
}
```

### Writing Tests

**Location**: `tests/` directory

**Example Structure:**

```typescript
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // Navigate to your test page
  await page.goto("http://localhost:3005");
});

test("script loads correctly", async ({ page }) => {
  // Your test assertions
  await expect(page.locator("#element")).toBeVisible();
});

test("function executes", async ({ page }) => {
  // Test your Webflow script functionality
  const result = await page.evaluate(() => {
    // Execute your script's functions
    return window.yourFunction();
  });
  
  expect(result).toBe(expectedValue);
});
```

### Running Tests

```bash
# Headless mode (CI/CD friendly)
pnpm test

# UI mode (visual debugging)
pnpm test:ui

# Specific browser
pnpm test --project=chromium
```

**Integration with Development:**
- Playwright automatically starts the dev server (`pnpm dev`)
- Tests run against `localhost:3005`
- Server stays running for quick test iteration

---

## Project Structure

```
codalyn-loadout/
├── bin/                          # Build scripts
│   ├── build.js                  # Main build configuration
│   └── live-reload.js            # Live reload client script
│
├── dist/                         # Build output (gitignored)
│   ├── index.js                  # Compiled JavaScript
│   ├── index.css                 # Compiled CSS
│   ├── chunks/                   # Code-split chunks
│   └── index.js.map              # Sourcemaps (dev only)
│
├── src/                          # Source code
│   ├── index.ts                  # Main entry point
│   ├── features/                 # Feature modules
│   │   └── carousel/             # Carousel component
│   │       ├── index.ts          # Public API
│   │       ├── lib.ts            # Implementation
│   │       ├── model.ts          # Configuration
│   │       ├── types.ts          # Domain types
│   │       ├── integration/      # IX3 integration
│   │       └── README.md         # Feature docs
│   ├── shared/                   # Shared infrastructure
│   │   └── interaction-bridge/  # Webflow IX3 integration
│   │       ├── emit.ts           # Event emission
│   │       ├── state.ts          # State management
│   │       └── index.ts          # Public API
│   └── utils/                    # Utility modules
│       ├── greet.ts              # Example utility
│       └── features.ts           # Feature loader
│
├── tests/                        # Playwright tests
│   └── example.spec.ts           # Test specifications
│
├── biome.json                    # Biome configuration
├── playwright.config.ts          # Playwright configuration
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Project metadata & scripts
└── pnpm-lock.yaml                # Dependency lock file
```

### Source Code Organization

#### Entry Point (`src/index.ts`)

**Purpose**: Main entry point that gets compiled into `dist/index.js`.

**Example Implementation:**

```typescript
import { initCarousel } from './features/carousel';
import { greetUser } from './utils/greet';

window.Webflow ||= [];
window.Webflow.push(() => {
  greetUser('MILES');
  initCarousel();
});
```

**Key Pattern**: The `window.Webflow.push()` pattern ensures your code runs after Webflow's scripts have loaded. This example demonstrates importing and initializing feature modules.

#### Utility Module (`src/utils/greet.ts`)

**Purpose**: Reusable utility functions.

**Example Implementation:**

```typescript
import { getPublishDate } from "@finsweet/ts-utils";

/**
 * Greets the user by printing a message in the console.
 * @param name The user's name.
 */
export const greetUser = (name: string) => {
  const publishDate = getPublishDate();
  
  console.log(`Hello ${name}!`);
  console.log(
    `This site was last published on ${publishDate?.toLocaleDateString(
      "en-US",
      {
        year: "numeric",
        month: "long",
        day: "2-digit",
      }
    )}.`
  );
};
```

**Demonstrates:**
- TypeScript function with JSDoc comments
- Use of Finsweet's TypeScript utilities
- Proper exports for modular code

---

## Configuration Files

### `package.json`

**Key Scripts:**

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `cross-env NODE_ENV=development node ./bin/build.js` | Start development server |
| `build` | `cross-env NODE_ENV=production node ./bin/build.js` | Build for production |
| `lint` | `biome lint ./src` | Check code quality |
| `lint:fix` | `biome lint --write ./src` | Auto-fix linting issues |
| `check` | `biome check ./src && tsc --noEmit` | Full check (lint + types) |
| `check:fix` | `biome check --write ./src && tsc --noEmit` | Fix all issues |
| `format` | `biome format --write ./src` | Format all files |
| `test` | `playwright test` | Run all tests |
| `test:ui` | `playwright test --ui` | Run tests with UI |
| `update` | `pnpm update -i -L -r` | Interactive dependency updates |

**Important Fields:**

```json
{
  "type": "module",           // Use ES modules
  "main": "src/index.ts",     // Entry point
  "engines": {
    "pnpm": ">=10"            // Requires pnpm 10+
  }
}
```

### `tsconfig.json`

**Purpose**: Configure TypeScript compiler.

**Key Settings:**

```json
{
  "extends": "@finsweet/tsconfig",
  "compilerOptions": {
    "rootDir": ".",
    "baseUrl": "./",
    "paths": {
      "$utils/*": ["src/utils/*"]    // Path alias
    },
    "types": ["@finsweet/ts-utils"]  // Type definitions
  }
}
```

**Path Aliases:**

Path aliases allow cleaner imports:

```typescript
// ❌ Without alias
import { greetUser } from "../../utils/greet";

// ✅ With alias
import { greetUser } from "$utils/greet";
```

**Adding New Aliases:**

```json
{
  "paths": {
    "$utils/*": ["src/utils/*"],
    "$components/*": ["src/components/*"],
    "$types/*": ["src/types/*"]
  }
}
```

### `biome.json`

**Purpose**: Configure Biome linter and formatter.

**Key Settings:**

```json
{
  "formatter": {
    "enabled": true,
    "indentStyle": "space",    // Use 2 spaces for indentation
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",  // Use single quotes
      "trailingCommas": "es5",
      "semicolons": "always",
      "arrowParentheses": "always"
    }
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  }
}
```

### `playwright.config.ts`

**Purpose**: Configure Playwright testing framework.

**Key Features:**

- Tests run on Chromium, Firefox, and WebKit
- Automatically starts dev server before tests
- Trace collection on test failure
- Different configs for CI vs local development

---

## Feature Loading Architecture

### Conditional Feature Loading

The codebase implements an optimized feature loading pattern that ensures features are only loaded when needed on a given page.

#### Why This Matters

**Performance Benefits:**
- **Reduced Initial Bundle**: Main bundle is only ~355 bytes (minified)
- **Code Splitting**: Features are loaded on-demand via dynamic imports
- **Zero Overhead**: Pages without features don't download unused code
- **Parallel Loading**: Multiple features load simultaneously when needed

**Example Bundle Sizes:**
```
dist/
├── index.js          (355 bytes)   ← Main bundle loaded on every page
└── chunks/
    └── carousel-*.js (83 KB)       ← Only loads on pages with carousels
```

#### Architecture Pattern

**Location:** [src/utils/features.ts](../src/utils/features.ts)

**Core Functions:**

1. **`initFeature(selector, loader)`** - Conditionally loads a single feature
2. **`initFeatures(features)`** - Loads multiple features in parallel

**How It Works:**

```typescript
// 1. Check if feature elements exist in the DOM
if (!document.querySelector('[data-slider-instance]')) {
  return; // Exit immediately, no code loaded
}

// 2. Only if elements exist, dynamically import the feature
const module = await import('./features/carousel');

// 3. Initialize the feature
module.init();
```

#### Implementation Guide

##### Step 1: Create a Feature Module

All features must export a standardized `init` function:

```typescript
// src/features/your-feature/index.ts
export function init(): void {
  const elements = document.querySelectorAll('[data-your-feature]');

  elements.forEach(element => {
    // Initialize your feature
  });
}
```

**FSD Structure:**
```
src/features/your-feature/
├── index.ts    # Public API with init() function
├── lib.ts      # Implementation logic
├── model.ts    # Business logic & configuration
├── types.ts    # Domain types
└── styles.css  # Feature styles (optional)
```

##### Step 2: Register the Feature

Add your feature to the main entry point:

```typescript
// src/index.ts
import { initFeatures } from './utils/features';

window.Webflow ||= [];
window.Webflow.push(() => {
  initFeatures([
    ['[data-slider-instance]', () => import('./features/carousel')],
    ['[data-your-feature]', () => import('./features/your-feature')],
  ]);
});
```

##### Step 3: Add HTML Attributes in Webflow

In Webflow Designer, add the data attribute to elements that need the feature:

```html
<div data-your-feature>
  <!-- Your Webflow element -->
</div>
```

#### Real-World Example: Carousel Feature

**1. Feature Module** ([src/features/carousel/index.ts](../src/features/carousel/index.ts)):

```typescript
const CAROUSEL_SELECTOR = '[data-slider-instance]';

export function init(): void {
  const elements = document.querySelectorAll<HTMLElement>(CAROUSEL_SELECTOR);

  const instances = Array.from(elements)
    .map(element => createCarousel(element))
    .filter(instance => instance !== null);
}

// Alias for backward compatibility
export const initCarousel = init;
```

**2. Registration** ([src/index.ts](../src/index.ts)):

```typescript
initFeatures([
  ['[data-slider-instance]', () => import('./features/carousel')],
]);
```

**3. Webflow HTML:**

```html
<div class="swiper"
     data-slider-instance
     data-slides-per-view="3">
  <div class="swiper-wrapper">
    <div class="swiper-slide">Slide 1</div>
  </div>
</div>
```

#### Error Handling

The feature loader includes automatic error handling:

```typescript
try {
  const module = await loader();
  module.init();
} catch (error) {
  console.error(`Failed to initialize feature for selector "${selector}":`, error);
  // Feature fails gracefully without breaking other features
}
```

**Benefits:**
- One failing feature doesn't break others
- Errors are logged for debugging
- Page remains functional

#### Performance Characteristics

**Scenario 1: Page WITHOUT Carousel**
```
1. Load index.js (355 bytes) ✓
2. Run querySelectorAll('[data-slider-instance]') (~1ms)
3. No matches found, exit immediately
4. Total overhead: ~355 bytes + ~1ms
```

**Scenario 2: Page WITH Carousel**
```
1. Load index.js (355 bytes) ✓
2. Run querySelectorAll('[data-slider-instance]') (~1ms)
3. Match found, import carousel chunk
4. Load carousel-*.js (83 KB) ✓
5. Initialize carousel instances
6. Total: 83.3 KB (loaded only on needed pages)
```

**Scenario 3: Page WITH Multiple Features**
```
1. Load index.js (355 bytes) ✓
2. Check all feature selectors in parallel
3. Import matching features simultaneously
4. Initialize all features
5. Total: Only loads what's needed
```

#### Build Configuration

Code splitting is enabled in [bin/build.js](../bin/build.js):

```javascript
const context = await esbuild.context({
  splitting: true,              // Enable code splitting
  format: 'esm',               // ESM required for splitting
  chunkNames: 'chunks/[name]-[hash]',  // Organize chunks
  // ... other config
});
```

**Output Structure:**
```
dist/
├── index.js              # Main entry (tiny)
├── index.css            # Compiled styles
└── chunks/              # Feature chunks (lazy-loaded)
    ├── carousel-*.js
    ├── tabs-*.js
    └── modal-*.js
```

#### Best Practices

**1. Use Specific Selectors**
```typescript
// ✅ Good - specific and unique
['[data-slider-instance]', () => import('./features/carousel')]

// ❌ Bad - too generic
['.swiper', () => import('./features/carousel')]
```

**2. Group Related Features**
```typescript
// ✅ Good - features load independently
initFeatures([
  ['[data-carousel]', () => import('./features/carousel')],
  ['[data-tabs]', () => import('./features/tabs')],
]);

// ❌ Bad - all features in one module
import './features'; // Loads everything
```

**3. Keep Chunks Focused**
```typescript
// ✅ Good - feature has clear responsibility
features/carousel/     # Just carousel logic

// ❌ Bad - mixed responsibilities
features/ui-elements/  # Carousel + tabs + modal (loads all together)
```

**4. Test Performance**
```bash
# Check bundle sizes
pnpm build
du -h dist/*.js dist/chunks/*.js

# Verify code splitting
cat dist/index.js  # Should be very small
```

#### Migration Guide

If you have existing features that load unconditionally:

**Before:**
```typescript
// src/index.ts
import { initCarousel } from './features/carousel';

window.Webflow.push(() => {
  initCarousel(); // Always runs
});
```

**After:**
```typescript
// src/index.ts
import { initFeatures } from './utils/features';

window.Webflow.push(() => {
  initFeatures([
    ['[data-slider-instance]', () => import('./features/carousel')],
  ]);
});
```

**Update feature module:**
```typescript
// src/features/carousel/index.ts

// Add standardized init export
export const init = initCarousel;

// Keep existing export for backward compatibility
export { initCarousel };
```

---

## Webflow IX3 Integration

### Shared Interaction Bridge

The project includes a shared interaction bridge (`src/shared/interaction-bridge/`) that provides standardized integration with Webflow's GSAP (IX3) system. This infrastructure enables features to emit custom events and apply state markers for GSAP animations.

#### Core Components

**Event Emission** ([src/shared/interaction-bridge/emit.ts](../src/shared/interaction-bridge/emit.ts)):
- Safe, environment-aware IX3 event triggering
- Automatic caching of Webflow IX3 API
- No-op behavior when IX3 is unavailable

**State Management** ([src/shared/interaction-bridge/state.ts](../src/shared/interaction-bridge/state.ts)):
- Consistent DOM state marker application
- Supports custom state attribute names
- Helpers for setting, clearing, and getting state values

#### Usage Example

```typescript
import { emit, setState } from '../../shared/interaction-bridge';

// Emit a custom IX3 event
emit('state-change:start', {
  featureId: 'hero',
  slideIndex: 0
});

// Apply state markers to elements
const slides = carousel.querySelectorAll('.slide');
setState(slides, {
  active: 0,
  prev: 2,
  next: 1
});
```

#### Carousel IX3 Integration

The carousel feature demonstrates how to integrate with the interaction bridge:

**Location:** [src/features/carousel/integration/interactionBridge.ts](../src/features/carousel/integration/interactionBridge.ts)

**Features:**
- Translates Swiper events to IX3 events
- Applies `data-state` attributes to slides
- Supports custom event names and feature IDs
- Handles looping carousels correctly

**HTML Configuration:**
```html
<div
  data-slider-instance
  data-feature-id="hero"
  data-interaction-prefix="carousel"
  class="swiper">
  <div class="swiper-wrapper">
    <div class="swiper-slide">Slide 1</div>
  </div>
</div>
```

**Webflow IX3 Setup:**
1. Create interaction with trigger: Custom event `interaction:state-change:start`
2. Target: `[data-feature-id="hero"] [data-state="active"] .your-element`
3. Add GSAP animation (fade, slide, scale, etc.)

#### Building New Features with IX3

When creating new features that need IX3 integration:

1. **Import the bridge:**
   ```typescript
   import { emit, setState } from '../../shared/interaction-bridge';
   ```

2. **Emit events at lifecycle points:**
   ```typescript
   // On feature initialization
   emit('init', { type: 'your-feature', featureId: 'feature-1' });

   // On state changes
   emit('state-change:start', { featureId: 'feature-1', data: {} });
   ```

3. **Apply state markers:**
   ```typescript
   const items = feature.querySelectorAll('.item');
   setState(items, { active: newIndex });
   ```

4. **Support configuration via data attributes:**
   ```typescript
   interface FeatureDataset {
     featureId?: string;
     interactionEvents?: string;
     interactionPrefix?: string;
   }
   ```

#### Best Practices

1. **Use canonical event names** - Start with `interaction:*` prefix unless feature-specific
2. **Include feature IDs** - Always emit feature IDs in event payloads for scoping
3. **State markers before events** - Apply DOM state changes before emitting events
4. **Support opt-out** - Allow disabling IX3 events via configuration
5. **Handle unavailability** - The bridge handles missing IX3 gracefully

---

## Best Practices

### Webflow-Specific Patterns

#### 1. Wait for Webflow Ready

**Always** wrap your code in the Webflow ready callback:

```typescript
window.Webflow ||= [];
window.Webflow.push(() => {
  // Your code here runs after Webflow is ready
});
```

#### 2. Use TypeScript Types for Webflow Elements

```typescript
// Define types for your Webflow elements
interface WebflowElements {
  button: HTMLButtonElement;
  form: HTMLFormElement;
  container: HTMLDivElement;
}

// Type-safe element selection
const elements: WebflowElements = {
  button: document.querySelector('[data-element="button"]') as HTMLButtonElement,
  form: document.querySelector('[data-element="form"]') as HTMLFormElement,
  container: document.querySelector('[data-element="container"]') as HTMLDivElement,
};
```

#### 3. Use Data Attributes for Selectors

```html
<!-- In Webflow, add data attributes -->
<div data-component="navigation"></div>
<button data-action="submit"></button>
```

```typescript
// Select using data attributes
const nav = document.querySelector('[data-component="navigation"]');
const submitBtn = document.querySelector('[data-action="submit"]');
```

**Benefits:**
- No conflicts with Webflow's class names
- More semantic and maintainable
- Clearer intent in code

#### 4. Handle Multiple Instances

```typescript
// For multiple instances of the same component
const buttons = document.querySelectorAll('[data-component="button"]');

buttons.forEach((button) => {
  button.addEventListener('click', () => {
    // Handle click
  });
});
```

#### 5. Use Finsweet TypeScript Utils

```typescript
import { 
  getPublishDate,
  linkTo,
  scrollIntoView,
  getFormData
} from "@finsweet/ts-utils";

// Get publish date
const date = getPublishDate();

// Programmatic navigation
linkTo('/about');

// Smooth scroll
scrollIntoView(element, { behavior: 'smooth' });

// Get form data as object
const data = getFormData(formElement);
```

### Code Organization

#### 1. Modular Structure

```typescript
// src/components/accordion.ts
export class Accordion {
  constructor(private element: HTMLElement) {
    this.init();
  }
  
  private init() {
    // Setup accordion
  }
}

// src/index.ts
import { Accordion } from './components/accordion';

window.Webflow ||= [];
window.Webflow.push(() => {
  const accordions = document.querySelectorAll('[data-component="accordion"]');
  accordions.forEach(el => new Accordion(el as HTMLElement));
});
```

#### 2. Configuration Files

```typescript
// src/config/api.ts
export const API_CONFIG = {
  baseUrl: 'https://api.example.com',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
};

// src/config/features.ts
export const FEATURES = {
  enableAnalytics: true,
  enableChat: false,
  debugMode: false,
};
```

#### 3. Type Definitions

```typescript
// src/types/webflow.ts
export interface WebflowConfig {
  siteId: string;
  environment: 'development' | 'production';
}

export interface FormData {
  name: string;
  email: string;
  message: string;
}
```

### Performance Optimization

#### 1. Lazy Loading

```typescript
// Only load heavy modules when needed
async function loadChart() {
  const { Chart } = await import('./components/chart');
  return new Chart();
}

button.addEventListener('click', async () => {
  const chart = await loadChart();
  chart.render();
});
```

#### 2. Debouncing

```typescript
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Usage
const handleResize = debounce(() => {
  // Expensive operation
}, 250);

window.addEventListener('resize', handleResize);
```

#### 3. Event Delegation

```typescript
// Instead of attaching listeners to every button
const container = document.querySelector('[data-component="list"]');

container?.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  
  if (target.matches('[data-action="delete"]')) {
    handleDelete(target);
  }
});
```

### Error Handling

#### 1. Graceful Degradation

```typescript
window.Webflow ||= [];
window.Webflow.push(() => {
  try {
    // Your main code
    initializeFeatures();
  } catch (error) {
    console.error('Error initializing features:', error);
    // Fallback behavior or user notification
  }
});
```

#### 2. Element Existence Checks

```typescript
const element = document.querySelector('[data-component="feature"]');

if (!element) {
  console.warn('Feature element not found');
  return;
}

// Proceed with element
initializeFeature(element);
```

#### 3. API Error Handling

```typescript
async function fetchData(url: string) {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch data:', error);
    // Show user-friendly error message
    showErrorMessage('Unable to load content. Please try again later.');
    return null;
  }
}
```

### Development Tips

#### 1. Console Logging for Debugging

```typescript
// Development-only logging
const isDev = process.env.NODE_ENV === 'development';

if (isDev) {
  console.log('Script initialized', { data });
}
```

#### 2. Use Biome Disable Comments Sparingly

```typescript
// Only when absolutely necessary
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: this function needs multiple nested checks
function complexCalculation() {
  // ...
}
```

#### 3. Document Complex Logic

```typescript
/**
 * Calculates the total price including tax and discounts.
 * 
 * @param basePrice - The original price before modifications
 * @param taxRate - Tax rate as a decimal (e.g., 0.08 for 8%)
 * @param discountCode - Optional discount code
 * @returns The final price after all calculations
 * 
 * @example
 * ```typescript
 * const price = calculatePrice(100, 0.08, 'SAVE10');
 * // Returns: 97.2 (100 - 10% discount + 8% tax)
 * ```
 */
function calculatePrice(
  basePrice: number,
  taxRate: number,
  discountCode?: string
): number {
  // Implementation
}
```

---

## Troubleshooting

### Common Issues

#### 1. Script Not Loading in Webflow

**Symptoms:**
- No console output
- Functions not executing

**Solutions:**
- Check browser console for 404 errors
- Verify script URL is correct
- Ensure CORS headers are set on hosting server
- Check that script tag uses `defer` attribute
- Verify script is in Footer Code, not Header

#### 2. TypeScript Errors

**Symptoms:**
- Red squiggly lines in editor
- `pnpm check` fails

**Solutions:**
- Run `pnpm check` to see specific errors
- Ensure types are properly imported
- Check `tsconfig.json` paths are correct
- Restart TypeScript server in VSCode

#### 3. Live Reload Not Working

**Symptoms:**
- Changes don't appear in browser
- Need to manually refresh

**Solutions:**
- Check dev server is running (`pnpm dev`)
- Verify `http://localhost:3005` is accessible
- Check browser console for EventSource errors
- Ensure you're using development script tag, not production

#### 4. Formatting Issues

**Symptoms:**
- Code formatting conflicts
- Different formatting on save vs build

**Solutions:**
- Ensure Biome VSCode extension is installed and enabled
- Run `pnpm check:fix` to auto-fix all formatting issues
- Configure VSCode to format on save with Biome

#### 5. Build Fails

**Symptoms:**
- `pnpm build` exits with errors
- Missing output files

**Solutions:**
- Check for TypeScript errors first: `pnpm check`
- Verify all imports are correct
- Check for syntax errors
- Review build output for specific error messages

#### 6. Path Aliases Not Working

**Symptoms:**
- Import errors with `$utils/*` paths
- "Cannot find module" errors

**Solutions:**
- Verify paths are defined in `tsconfig.json`
- Restart TypeScript server
- Check that `baseUrl` is set correctly
- Ensure paths match directory structure

### Getting Help

If you encounter issues not covered here:

1. Check browser console for errors
2. Review esbuild output during build
3. Run linting and type checking: `pnpm lint && pnpm check`
4. Check Playwright test results for integration issues
5. Verify Webflow site is published and accessible

---

## Additional Resources

### Finsweet TypeScript Utils

Documentation: https://github.com/finsweet/ts-utils

Common utilities for Webflow development:
- Form handling
- Date utilities
- Scroll functions
- Navigation helpers
- Query parameter parsing

### esbuild Documentation

Website: https://esbuild.github.io/

Learn about:
- Advanced bundling options
- Performance optimization
- Plugin system
- API reference

### Webflow Documentation

Website: https://developers.webflow.com/

Topics:
- Custom code integration
- JavaScript API
- CMS integration
- Best practices

### TypeScript Handbook

Website: https://www.typescriptlang.org/docs/

Essential reading for:
- Type system fundamentals
- Advanced types
- Generics
- Utility types

---

## Changelog

### Initial Setup
- esbuild build pipeline with development and production modes
- TypeScript configuration with path aliases
- Live reload system for development
- Biome linter and formatter integration
- Playwright testing setup
- Finsweet TypeScript utilities integration
- Swiper carousel integration

---

**Last Updated**: October 16, 2025  
**Maintained By**: Codalyn Development Team

