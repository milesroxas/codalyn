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
import { resolveBeaconTowerOriginForBuild } from "./src/shared/lib/resolve-beacon-tower-origin-for-build";

const beaconRoot = path.dirname(fileURLToPath(import.meta.url));
const towerRoot = path.join(beaconRoot, "../tower");

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

export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: [
    tailwindcss(),
    react(),
    // Marketplace review: no dev-host literals in shipped bundles (build-only transform).
    createStripDevHostLiteralsPlugin({ strict: mode !== "development" }),
    ...(isVitest ? [] : [createWebflowDesignerExtensionPlugin({ appRoot: beaconRoot })]),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_CHANNEL__: JSON.stringify(mode),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __BEACON_TOWER_ORIGIN__: JSON.stringify(isVitest ? "" : resolveTowerOrigin(mode)),
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
      output: {
        entryFileNames: "bundle.js",
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
}));
