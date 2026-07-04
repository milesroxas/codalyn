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
    // Fake origin so `isTowerConfigured()` is true and signed-in UI states are reachable.
    // No server exists there: every request is intercepted by MSW (see `.storybook/tower-mock.ts`);
    // unhandled paths get a deterministic 404 from the catch-all handler.
    __BEACON_TOWER_ORIGIN__: JSON.stringify("https://tower.mock"),
    // The CMS Slots surface flag defaults on in dev but off in prod builds; pin it on so the
    // static Storybook build (`storybook:build`) catalogs the same UI as `storybook` dev.
    "import.meta.env.VITE_CMS_SLOTS_SURFACE_ENABLED": JSON.stringify("true"),
  },
  resolve: {
    alias: {
      "@": path.resolve(beaconRoot, "src"),
      // Lets story files import Storybook-only harness helpers (`~sb/beacon-app`) without
      // fragile ../../.. paths. Only this config and tsconfig know it — app builds never
      // resolve it, which keeps harness code out of the extension bundle by construction.
      "~sb": path.resolve(beaconRoot, ".storybook"),
    },
  },
  optimizeDeps: {
    exclude: ["@codalyn/webflow-kit", "@codalyn/webflow-kit/react", "@codalyn/observability"],
  },
});
