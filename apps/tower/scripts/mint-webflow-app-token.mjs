#!/usr/bin/env node
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
/**
 * Mint an operator-owned Webflow Data Client OAuth access token (e.g. for
 * WEBFLOW_FLINT_TOKEN_RESOLVE_BEARER). Runs the OAuth Authorization-Code flow once:
 * starts a tiny local server to catch the redirect, exchanges the code, and prints
 * the access token. Webflow tokens have no expiry/refresh, so the printed token is
 * long-lived.
 *
 * Usage (from apps/tower):
 *   node scripts/mint-webflow-app-token.mjs --app flint
 *   node scripts/mint-webflow-app-token.mjs --client-id X --client-secret Y
 *
 * Flags:
 *   --app flint|beacon   Read WEBFLOW_FLINT_* (flint) or WEBFLOW_* (beacon) from .env.local. Default: flint.
 *   --client-id          Override client id.
 *   --client-secret      Override client secret.
 *   --scope              OAuth scopes. Default: "authorized_user:read".
 *   --port               Local callback port. Default: 4477.
 *
 * IMPORTANT: register the printed redirect URI (http://localhost:<port>/callback)
 * on the Webflow app's Data Client OAuth settings before running.
 */
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TOWER_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const hasValue = argv[i + 1] && !argv[i + 1].startsWith("--");
      let val = "true";
      if (hasValue) {
        i += 1;
        val = argv[i];
      }
      out[key] = val;
    }
  }
  return out;
}

/** Minimal .env parser — only to read client id/secret locally (no dependency on dotenv). */
function readEnvFile(file) {
  const env = {};
  try {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) {
        env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    /* file may not exist */
  }
  return env;
}

const args = parseArgs(process.argv.slice(2));
const app = args.app === "beacon" ? "beacon" : "flint";
const scope = args.scope ?? "authorized_user:read";
const port = Number(args.port ?? 4477);
const redirectUri = `http://localhost:${port}/callback`;

const fileEnv = { ...readEnvFile(path.join(TOWER_ROOT, ".env")), ...readEnvFile(path.join(TOWER_ROOT, ".env.local")) };
const prefix = app === "flint" ? "WEBFLOW_FLINT_" : "WEBFLOW_";
const clientId = args["client-id"] ?? fileEnv[`${prefix}CLIENT_ID`] ?? process.env[`${prefix}CLIENT_ID`];
const clientSecret =
  args["client-secret"] ?? fileEnv[`${prefix}CLIENT_SECRET`] ?? process.env[`${prefix}CLIENT_SECRET`];

if (!clientId || !clientSecret) {
  console.error(
    `Missing client id/secret for "${app}". Set ${prefix}CLIENT_ID and ${prefix}CLIENT_SECRET in apps/tower/.env.local, ` +
      `or pass --client-id / --client-secret.`
  );
  process.exit(1);
}

const state = randomBytes(16).toString("hex");
const authorizeUrl =
  `https://webflow.com/oauth/authorize?response_type=code` +
  `&client_id=${encodeURIComponent(clientId)}` +
  `&redirect_uri=${encodeURIComponent(redirectUri)}` +
  `&scope=${encodeURIComponent(scope)}` +
  `&state=${state}`;

async function exchangeCodeForToken(code) {
  const res = await fetch("https://api.webflow.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`token exchange failed: ${res.status} ${text}`);
  }
  return JSON.parse(text);
}

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  if (url.pathname !== "/callback") {
    res.writeHead(404).end("not found");
    return;
  }
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  if (!code) {
    res.writeHead(400).end("missing code");
    return;
  }
  if (returnedState !== state) {
    res.writeHead(400).end("state mismatch — restart the script");
    console.error("\n✗ state mismatch; aborting.");
    server.close();
    process.exit(1);
  }
  exchangeCodeForToken(code)
    .then((token) => {
      res
        .writeHead(200, { "Content-Type": "text/plain" })
        .end("Token minted — return to your terminal. You can close this tab.");
      console.log(`\n✓ Access token for the ${app} app (scope: ${token.scope ?? scope}):\n`);
      console.log(`${prefix}TOKEN_RESOLVE_BEARER=${token.access_token}\n`);
      console.log("Paste that line into apps/tower/.env.local, then restart Tower.");
      server.close();
      process.exit(0);
    })
    .catch((err) => {
      res.writeHead(500).end(String(err));
      console.error(`\n✗ ${err}`);
      server.close();
      process.exit(1);
    });
});

server.listen(port, () => {
  console.log(`\nMinting a Webflow access token for the "${app}" app.`);
  console.log(`Redirect URI (must be registered on the app's Data Client OAuth): ${redirectUri}\n`);
  console.log("1. Open this URL in your browser and approve:\n");
  console.log(`   ${authorizeUrl}\n`);
  console.log("2. After approving, the token prints here automatically.\n");
});
