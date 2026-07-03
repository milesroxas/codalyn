import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import pkg from "../package.json";

const beaconRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Storybook-only Vite config (see `.storybook/main.ts` for why the app config is not reused).
 * Keep the alias, `define` globals, and CSS pipeline in sync with `../vite.config.ts`.
 */
export default defineConfig({
  plugins: [tailwindcss(), react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_CHANNEL__: JSON.stringify("storybook"),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    // Empty origin = no Tower backend, same convention the Vitest run uses.
    __BEACON_TOWER_ORIGIN__: JSON.stringify(""),
  },
  resolve: {
    alias: {
      "@": path.resolve(beaconRoot, "src"),
    },
  },
  optimizeDeps: {
    exclude: ["@codalyn/webflow-kit", "@codalyn/webflow-kit/react", "@codalyn/observability"],
  },
});
