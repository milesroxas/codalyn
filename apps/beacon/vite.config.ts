/// <reference types="vitest/config" />
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
// @ts-expect-error — no .mjs typings; plugin is JS-only at repo root
import { createCssSourceMapPlugin } from "../../scripts/vite-css-sourcemap-plugin.mjs";
// @ts-expect-error — no .mjs typings; plugin is JS-only at repo root
import { createStripDevHostLiteralsPlugin } from "../../scripts/vite-strip-dev-host-literals.mjs";
// Shared JS module (see scripts/vite-wf-designer-extension-plugin.mjs)
// @ts-expect-error — no .mjs typings; plugin is JS-only at repo root
import { createWebflowDesignerExtensionPlugin } from "../../scripts/vite-wf-designer-extension-plugin.mjs";
import pkg from "./package.json";
import {
  BEACON_CSP_PLACEHOLDER,
  buildBeaconExtensionCspContent,
  buildQualityComparePopoutCspContent,
} from "./src/shared/lib/beacon-extension-csp";
import { resolveBeaconTowerOriginForBuild } from "./src/shared/lib/resolve-beacon-tower-origin-for-build";

const beaconRoot = path.dirname(fileURLToPath(import.meta.url));
const towerRoot = path.join(beaconRoot, "../tower");

/**
 * `cssCodeSplit: false` merges all imported CSS into one styles.css and links it into every HTML
 * entry. The quality-compare popout imports no CSS — it ships with its own static stylesheet
 * (public/quality-compare.css) — so drop the injected link from that document.
 */
function createStripMainCssFromPopoutPlugin() {
  return {
    name: "beacon-popout-strip-main-css",
    apply: "build" as const,
    transformIndexHtml: {
      order: "post" as const,
      handler(html: string, ctx: { filename: string }) {
        if (!ctx.filename.endsWith("quality-compare.html")) {
          return html;
        }
        return html.replace(/\s*<link rel="stylesheet"[^>]*href="[^"]*styles\.css"[^>]*>/, "");
      },
    },
  };
}

/**
 * Substitutes the enforced Content-Security-Policy into each shipped HTML document (Webflow
 * Marketplace external-endpoint allowlisting). Both source entries carry a placeholder meta tag;
 * builds replace it with the document's policy from beacon-extension-csp.ts, dev serve strips it
 * (Vite HMR needs websockets and inline preamble a production policy must not allow). A missing
 * placeholder fails the build — the CSP cannot silently drop out of a shipped document.
 */
function createBeaconCspPlugin(towerOrigin: string) {
  const placeholderMeta = `<meta http-equiv="Content-Security-Policy" content="${BEACON_CSP_PLACEHOLDER}" />`;
  return {
    name: "beacon-enforced-csp",
    transformIndexHtml: {
      order: "pre" as const,
      handler(html: string, ctx: { filename: string; server?: unknown }) {
        if (!html.includes(placeholderMeta)) {
          throw new Error(`beacon-enforced-csp: CSP placeholder meta tag missing from ${ctx.filename}`);
        }
        if (ctx.server) {
          return html.replace(placeholderMeta, "");
        }
        const content = ctx.filename.endsWith("quality-compare.html")
          ? buildQualityComparePopoutCspContent()
          : buildBeaconExtensionCspContent(towerOrigin);
        return html.replace(placeholderMeta, `<meta http-equiv="Content-Security-Policy" content="${content}" />`);
      },
    },
  };
}

/** Vitest loads this config; skip Webflow dev plugins so the process can exit cleanly. */
const isVitest = Boolean(process.env.VITEST);

/**
 * Quality-compare popout gate. The popout is withheld from Marketplace bundles for now: unless
 * `VITE_QUALITY_COMPARE_POPOUT_ENABLED=true`, the `quality-compare` Rollup input is not built, the
 * popout's static stylesheet is dropped from dist, and `__QUALITY_COMPARE_POPOUT_ENABLED__` is
 * defined `false` so the opener path (window.open + bridge wiring) is dead-code-eliminated from
 * bundle.js. Off must be *fully* off — Marketplace guidelines bar placeholder/dead features, and
 * orphaned popout files in the zip read as exactly that. Release builds additionally refuse an
 * enabled flag (FORBIDDEN_RELEASE_ENV in scripts/build-cli.mjs) and verify the archived zip carries
 * no "quality-compare" traces.
 */
function resolveQualityPopoutEnabled(mode: string): boolean {
  const beaconEnv = loadEnv(mode, beaconRoot, "");
  const raw = beaconEnv.VITE_QUALITY_COMPARE_POPOUT_ENABLED ?? process.env.VITE_QUALITY_COMPARE_POPOUT_ENABLED;
  return raw?.trim() === "true";
}

/**
 * `public/` is copied into dist verbatim and Vite has no per-file exclude, so when the popout is
 * disabled its stylesheet is deleted after the copy. Runs in `closeBundle` (after Vite's public-dir
 * copy) so the file cannot ship in the extension zip.
 */
function createDropQualityPopoutCssPlugin() {
  return {
    name: "beacon-drop-quality-popout-css",
    apply: "build" as const,
    closeBundle() {
      fs.rmSync(path.join(beaconRoot, "dist", "quality-compare.css"), { force: true });
    },
  };
}

/**
 * Tower base URL baked into the bundle.
 * - Dev / `vite build --mode development`: default `http://TOWER_DEV_HOST:TOWER_PORT` when unset.
 * - Production (`vite build --mode production`): defaults to tower.codalyn.app when unset.
 * - Preview (`vite build --mode preview`): defaults to tower-preview.codalyn.app when unset.
 *   Override with `VITE_TOWER_ORIGIN`. Marketing hosts and `http://localhost` are rejected in release builds;
 *   use `BEACON_ALLOW_LOCAL_TOWER_IN_PRODUCTION=1` for rare local Tower tests.
 */
function resolveTowerOrigin(mode: string): string {
  const beaconEnv = loadEnv(mode, beaconRoot, "");
  const towerEnv = loadEnv(mode, towerRoot, "");
  const explicit = beaconEnv.VITE_TOWER_ORIGIN?.trim() || process.env.VITE_TOWER_ORIGIN?.trim() || "";
  const allowLocalInProd =
    beaconEnv.BEACON_ALLOW_LOCAL_TOWER_IN_PRODUCTION === "1" ||
    process.env.BEACON_ALLOW_LOCAL_TOWER_IN_PRODUCTION === "1";

  return resolveBeaconTowerOriginForBuild({
    mode,
    explicitOrigin: explicit,
    allowLocalInProduction: allowLocalInProd,
    towerPort: beaconEnv.TOWER_PORT || towerEnv.PORT || towerEnv.TOWER_PORT || "3100",
    towerDevHost: beaconEnv.TOWER_DEV_HOST || "localhost",
  });
}

export default defineConfig(({ mode }) => {
  const towerOrigin = isVitest ? "" : resolveTowerOrigin(mode);
  // Vitest pins the flag on so popout unit/UI tests always exercise the real code paths; the
  // shipped state is decided by real builds, not the test runner.
  const qualityPopoutEnabled = isVitest || resolveQualityPopoutEnabled(mode);
  return {
    base: "./",
    plugins: [
      tailwindcss(),
      react(),
      // Marketplace review: no dev-host literals in shipped bundles (build-only transform).
      createStripDevHostLiteralsPlugin({ strict: mode !== "development" }),
      createStripMainCssFromPopoutPlugin(),
      ...(qualityPopoutEnabled ? [] : [createDropQualityPopoutCssPlugin()]),
      createBeaconCspPlugin(towerOrigin),
      // Marketplace submission form + App Review Preflight require a source map for styles.css too;
      // Vite emits none for CSS, so this plugin minifies the stylesheet itself (needs cssMinify: false
      // below) and writes styles.css.map, which build-cli moves into the private sourcemaps zip.
      createCssSourceMapPlugin(),
      ...(isVitest ? [] : [createWebflowDesignerExtensionPlugin({ appRoot: beaconRoot })]),
    ],
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __BUILD_CHANNEL__: JSON.stringify(mode),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __BEACON_TOWER_ORIGIN__: JSON.stringify(towerOrigin),
      __QUALITY_COMPARE_POPOUT_ENABLED__: JSON.stringify(qualityPopoutEnabled),
    },
    resolve: {
      alias: {
        "@": path.resolve(beaconRoot, "./src"),
      },
    },
    optimizeDeps: {
      exclude: ["@codalyn/webflow-kit", "@codalyn/webflow-kit/react", "@codalyn/observability"],
    },
    server: {
      port: 1337,
      watch: {
        usePolling: true,
        ignored: ["**/node_modules/**", "!**/node_modules/@codalyn/**"],
      },
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
      cssCodeSplit: false,
      // Minification of the merged stylesheet is done by createCssSourceMapPlugin (lightningcss, same
      // baseline targets) so that a styles.css.map exists for the submission form.
      cssMinify: false,
      // App Review Preflight (2026-09-14) "External API Calls" + "Silent Canvas Mutations" both flagged
      // Vite's modulepreload polyfill in bundle.js: it fetches `<link rel="modulepreload">` targets and
      // installs a document-wide MutationObserver to catch late-added links. Every browser the Webflow
      // Designer runs in supports modulepreload natively, so the polyfill is dead weight; without it the
      // links are plain hints and lazy chunks still load through `import()`.
      modulePreload: { polyfill: false },
      // Marketplace submission requires source maps for the minified bundle, uploaded separately in a
      // private form field. "hidden" emits dist/*.map without a `//# sourceMappingURL=` comment, so the
      // shipped bundle.js carries no map reference; scripts/build-cli.mjs then moves every .map out of
      // dist into a private sourcemaps zip *before* `webflow extension bundle` and verifies the
      // archived bundle contains none.
      sourcemap: "hidden",
      rollupOptions: {
        // The Designer Extension iframe (index.html) always ships. The compression-compare popout
        // window (quality-compare.html, a second Vite-built React entry — no hand-authored scripts
        // in public/) is flag-gated and only built when VITE_QUALITY_COMPARE_POPOUT_ENABLED=true.
        input: {
          main: path.resolve(beaconRoot, "index.html"),
          ...(qualityPopoutEnabled ? { "quality-compare": path.resolve(beaconRoot, "quality-compare.html") } : {}),
        },
        output: {
          entryFileNames: (chunk: { name: string }) =>
            chunk.name === "quality-compare" ? "quality-compare.js" : "bundle.js",
          assetFileNames: (assetInfo: { name?: string | undefined }) =>
            assetInfo.name?.endsWith(".css") ? "styles.css" : "assets/[name]-[hash][extname]",
        },
      },
    },
    test: {
      environment: "node",
      globals: true,
      passWithNoTests: true,
      setupFiles: ["./src/test/setup-tests.ts"],
      environmentMatchGlobs: [["**/*.test.tsx", "jsdom"]],
      coverage: {
        provider: "v8",
        reporter: ["text", "html"],
        include: ["src/**/*.{ts,tsx}"],
        exclude: [
          "**/*.d.ts",
          "**/__tests__/**",
          "**/vite-env.d.ts",
          "**/*.test.{ts,tsx}",
          "**/test/**",
          "**/*.stories.tsx",
        ],
      },
    },
  };
});
