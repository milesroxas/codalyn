/// <reference types="vitest/config" />
import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
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
  return {
    base: "./",
    plugins: [
      tailwindcss(),
      react(),
      // Marketplace review: no dev-host literals in shipped bundles (build-only transform).
      createStripDevHostLiteralsPlugin({ strict: mode !== "development" }),
      createStripMainCssFromPopoutPlugin(),
      createBeaconCspPlugin(towerOrigin),
      ...(isVitest ? [] : [createWebflowDesignerExtensionPlugin({ appRoot: beaconRoot })]),
    ],
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __BUILD_CHANNEL__: JSON.stringify(mode),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __BEACON_TOWER_ORIGIN__: JSON.stringify(towerOrigin),
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
      rollupOptions: {
        // Two documents ship in the extension bundle: the Designer Extension iframe (index.html)
        // and the compression-compare popout window (quality-compare.html). Both are Vite-built
        // React entries — no hand-authored scripts in public/.
        input: {
          main: path.resolve(beaconRoot, "index.html"),
          "quality-compare": path.resolve(beaconRoot, "quality-compare.html"),
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
