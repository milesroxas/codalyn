/// <reference types="vitest/config" />
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
// @ts-expect-error — shared JS module at repo root
import { createWebflowDesignerExtensionPlugin } from "../../scripts/vite-wf-designer-extension-plugin.mjs";
import pkg from "./package.json";

const flintRoot = path.dirname(fileURLToPath(import.meta.url));

/** Vitest loads this config; skip Webflow dev plugins so the process can exit cleanly. */
const isVitest = Boolean(process.env.VITEST);

export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: [
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
