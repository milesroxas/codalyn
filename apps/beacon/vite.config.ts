/// <reference types="vitest/config" />
import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";
import pkg from "./package.json";
import { resolveBeaconTowerOriginForBuild } from "./src/shared/lib/resolve-beacon-tower-origin-for-build";

const beaconRoot = __dirname;
const towerRoot = path.join(beaconRoot, "../tower");

/**
 * Tower base URL baked into the bundle.
 * - Dev / `vite build --mode development`: default `http://TOWER_DEV_HOST:TOWER_PORT` when unset.
 * - Production (`vite build --mode production`): defaults to tower.codalyn.app when unset.
 *   Override with `VITE_TOWER_ORIGIN`. Marketing hosts and `http://localhost` are rejected in production;
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

/** CORS for `/__webflow` when the Designer is HTTPS and the dev server is http://localhost (Chrome PNA). */
function resolveWebflowDevCorsHeaders(req: IncomingMessage): Record<string, string> {
  const origin = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
  const acrh = req.headers["access-control-request-headers"] as string | string[] | undefined;
  const allowHeaders = Array.isArray(acrh) ? acrh.join(", ") : (acrh ?? "*");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": allowHeaders,
    "Access-Control-Allow-Private-Network": "true",
    "Access-Control-Max-Age": "86400",
  };
  if (origin) {
    headers.Vary = "Origin";
  }
  return headers;
}

function webflowJsonDevMiddleware(configPath: string) {
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const pathOnly = req.url?.split("?")[0]?.split("#")[0]?.replace(/\/$/, "") ?? "";
    if (pathOnly !== "/__webflow") {
      next();
      return;
    }
    const cors = resolveWebflowDevCorsHeaders(req);
    if (req.method === "OPTIONS") {
      res.writeHead(204, cors);
      res.end();
      return;
    }
    if (req.method === "GET") {
      res.writeHead(200, { ...cors, "Content-Type": "application/json" });
      res.end(fs.readFileSync(configPath, "utf-8"));
      return;
    }
    res.statusCode = 405;
    res.end();
  };
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
      server.middlewares.use(webflowJsonDevMiddleware(configPath));
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
    setupFiles: ["./src/test/setup-tests.ts"],
    environmentMatchGlobs: [["**/*.test.tsx", "jsdom"]],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["**/*.d.ts", "**/__tests__/**", "**/vite-env.d.ts", "**/*.test.{ts,tsx}", "**/test/**"],
    },
  },
}));
