/// <reference types="vitest/config" />
import fs from "node:fs";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";
import pkg from "./package.json";

const beaconRoot = __dirname;
const towerRoot = path.join(beaconRoot, "../tower");

/** Resolves Tower base URL: explicit VITE_TOWER_ORIGIN, else http://TOWER_DEV_HOST:TOWER_PORT using Beacon + Tower env (incl. Tower `PORT`). */
function resolveTowerOrigin(mode: string): string {
  const beaconEnv = loadEnv(mode, beaconRoot, "");
  const towerEnv = loadEnv(mode, towerRoot, "");
  const explicit = beaconEnv.VITE_TOWER_ORIGIN?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  // Default port matches apps/tower/scripts/dev.mjs when Tower `PORT` is unset.
  const port = beaconEnv.TOWER_PORT || towerEnv.PORT || towerEnv.TOWER_PORT || "3100";
  const host = beaconEnv.TOWER_DEV_HOST || "localhost";
  return `http://${host}:${port}`;
}

const wfDesignerExtensionPlugin = (): Plugin => {
  let webflowHTML = "";
  const configPath = path.join("./webflow.json");
  const configContent = fs.readFileSync(configPath, "utf-8");
  const webflowConfig = JSON.parse(configContent);

  return {
    name: "wf-vite-extension-plugin",
    transformIndexHtml: {
      order: "pre",
      handler: async (html: string, ctx) => {
        if (ctx.server) {
          console.log("\x1b[36m%s\x1b[0m", "Development mode");
          if (!webflowHTML) {
            const { name, apiVersion } = webflowConfig;
            const template = apiVersion === "2" ? "/template/v2" : "/template";
            const url = `https://webflow-ext.com${template}?name=${name}`;
            webflowHTML = await fetch(url).then((res) => res.text());
          }

          const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
          let scripts = "";
          let match: RegExpExecArray | null = scriptRegex.exec(webflowHTML);
          while (match !== null) {
            scripts += `${match[0]}\n`;
            match = scriptRegex.exec(webflowHTML);
          }

          const finalHTML = html.replace("</head>", `${scripts}</head>`);
          return finalHTML;
        }
      },
    },

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === "/__webflow") {
          res.writeHead(200, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
          });
          res.end(fs.readFileSync(configPath, "utf-8"));
        } else {
          next();
        }
      });
    },
  };
};

export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: [tailwindcss(), react(), wfDesignerExtensionPlugin()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_CHANNEL__: JSON.stringify(mode),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    "import.meta.env.VITE_TOWER_ORIGIN": JSON.stringify(resolveTowerOrigin(mode)),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
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
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["**/*.d.ts", "**/__tests__/**", "**/vite-env.d.ts"],
    },
  },
}));
