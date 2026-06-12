import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Shared Vite plugin for Webflow Designer Extensions (Beacon, Flint).
 * - Dev: inject Designer API boot scripts from webflow-ext.com template
 * - Dev: serve webflow.json at /__webflow for `webflow extension serve`
 */
export function createWebflowDesignerExtensionPlugin(options = {}) {
  const {
    appRoot = process.cwd(),
    /** When true, restart the Vite dev server when src files change (Flint). */
    restartOnSourceChange = false,
  } = options;

  let webflowHTML = "";
  const configPath = path.join(appRoot, "webflow.json");
  const configContent = fs.readFileSync(configPath, "utf-8");
  const webflowConfig = JSON.parse(configContent);

  return {
    name: "wf-vite-extension-plugin",
    transformIndexHtml: {
      order: "pre",
      handler: async (html, ctx) => {
        if (!ctx.server) {
          return;
        }
        console.log("\x1b[36m%s\x1b[0m", "Development mode");
        if (!webflowHTML) {
          const { name, apiVersion } = webflowConfig;
          const template = apiVersion === "2" ? "/template/v2" : "/template";
          const url = `https://webflow-ext.com${template}?name=${encodeURIComponent(name)}`;
          webflowHTML = await fetch(url).then((res) => res.text());
        }

        const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
        let scripts = "";
        let match = scriptRegex.exec(webflowHTML);
        while (match !== null) {
          scripts += `${match[0]}\n`;
          match = scriptRegex.exec(webflowHTML);
        }

        return html.replace("</head>", `${scripts}</head>`);
      },
    },

    configureServer(server) {
      server.middlewares.use(createWebflowJsonDevMiddleware(configPath));

      if (!restartOnSourceChange) {
        return;
      }

      void setupChokidarRestart(server, appRoot);
    },
  };
}

/** CORS for `/__webflow` when Designer is HTTPS and dev server is http://localhost (Chrome PNA). */
function resolveWebflowDevCorsHeaders(req) {
  const origin = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
  const acrh = req.headers["access-control-request-headers"];
  const allowHeaders = Array.isArray(acrh) ? acrh.join(", ") : (acrh ?? "*");
  const headers = {
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

function createWebflowJsonDevMiddleware(configPath) {
  return (req, res, next) => {
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

async function setupChokidarRestart(server, appRoot) {
  const chokidar = await import("chokidar");
  const watcher = chokidar.watch(["./src/**/*.tsx", "./src/**/*.ts", "./src/**/*.css"], {
    cwd: appRoot,
    ignoreInitial: true,
    persistent: true,
  });

  watcher.on("all", (event, filePath) => {
    console.log("\x1b[33m%s\x1b[0m", `File ${filePath} has been ${event}, restarting server...`);
    void server.restart();
  });

  server.httpServer?.on("close", () => {
    void watcher.close();
  });
}
