import path from "node:path";
import { fileURLToPath } from "node:url";
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.join(__dirname, "../..");

const nextConfig: NextConfig = {
  /** Expose marketing origin to the client for post-sign-out redirects (mirrors TOWER_MARKETING_URL). */
  env: {
    NEXT_PUBLIC_TOWER_MARKETING_URL:
      process.env.TOWER_MARKETING_URL?.trim() || process.env.NEXT_PUBLIC_TOWER_MARKETING_URL?.trim() || "",
  },
  transpilePackages: ["@codalyn/webflow-kit", "@codalyn/observability"],
  /** Trace files from the monorepo root so Docker `standalone` bundles workspace deps correctly. */
  outputFileTracingRoot: monorepoRoot,
  /** Sentry/OpenTelemetry instrumentation — must resolve from tower's node_modules (single version). */
  serverExternalPackages: ["import-in-the-middle", "require-in-the-middle"],
  turbopack: {
    /** Watch linked workspace packages under `packages/*` during dev. */
    root: monorepoRoot,
  },
  output: "standalone",
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
});
