/// <reference types="vitest/config" />
import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
// @ts-expect-error — shared JS module at repo root
import { createWebflowDesignerExtensionPlugin } from "../../scripts/vite-wf-designer-extension-plugin.mjs";
import pkg from "./package.json";

const flintRoot = path.dirname(fileURLToPath(import.meta.url));
const towerRoot = path.resolve(flintRoot, "../tower");

/** Vitest loads this config; skip Webflow dev plugins so the process can exit cleanly. */
const isVitest = Boolean(process.env.VITEST);

/**
 * Tower origin baked into the build. Explicit `VITE_TOWER_ORIGIN` always wins.
 * In development the Tower dev server is the default; in release builds an
 * unset origin means Flint runs fully offline (free tier) — never a fallback to
 * a guessed host. Local `http://localhost` Tower is rejected for release builds.
 */
function resolveTowerOrigin(mode: string): string {
  const flintEnv = loadEnv(mode, flintRoot, "");
  const towerEnv = loadEnv(mode, towerRoot, "");
  const explicit = flintEnv.VITE_TOWER_ORIGIN?.trim() || process.env.VITE_TOWER_ORIGIN?.trim() || "";
  const isRelease = mode === "production" || mode === "preview";

  if (explicit) {
    const isLocal = explicit.startsWith("http://localhost") || explicit.startsWith("http://127.0.0.1");
    if (isRelease && isLocal && flintEnv.FLINT_ALLOW_LOCAL_TOWER_IN_PRODUCTION !== "1") {
      return "";
    }
    return explicit.replace(/\/$/, "");
  }

  if (isRelease) {
    return "";
  }
  const host = flintEnv.TOWER_DEV_HOST || "localhost";
  const port = flintEnv.TOWER_PORT || towerEnv.PORT || towerEnv.TOWER_PORT || "3100";
  return `http://${host}:${port}`;
}

export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: [
    tailwindcss(),
    react(),
    ...(isVitest
      ? []
      : [
          createWebflowDesignerExtensionPlugin({
            appRoot: flintRoot,
            restartOnSourceChange: true,
          }),
        ]),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_CHANNEL__: JSON.stringify(mode),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __FLINT_TOWER_ORIGIN__: JSON.stringify(isVitest ? "" : resolveTowerOrigin(mode)),
  },
  resolve: {
    alias: {
      "@": path.resolve(flintRoot, "./src"),
    },
  },
  server: {
    port: 1337,
    watch: {
      usePolling: true,
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
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["**/*.d.ts", "**/__tests__/**", "**/vite-env.d.ts"],
    },
  },
}));
