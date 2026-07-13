import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveCodalynBuildChannel } from "@codalyn/observability";
import { withPayload } from "@payloadcms/next/withPayload";
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import packageJson from "./package.json";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.join(__dirname, "../..");
const buildChannel = resolveCodalynBuildChannel(process.env.VERCEL_ENV ?? process.env.NODE_ENV);

const nextConfig: NextConfig = {
  /** Expose marketing origin to the client for post-sign-out redirects (mirrors TOWER_MARKETING_URL). */
  env: {
    NEXT_PUBLIC_TOWER_MARKETING_URL:
      process.env.TOWER_MARKETING_URL?.trim() || process.env.NEXT_PUBLIC_TOWER_MARKETING_URL?.trim() || "",
    NEXT_PUBLIC_CODALYN_BUILD_CHANNEL: buildChannel,
    NEXT_PUBLIC_CODALYN_APP_VERSION: packageJson.version,
  },
  transpilePackages: ["@codalyn/webflow-kit", "@codalyn/observability"],
  images: {
    /** CMS media served from Vercel Blob (local-dev uploads resolve same-origin, no pattern needed). */
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
  /** Trace files from the monorepo root so Docker `standalone` bundles workspace deps correctly. */
  outputFileTracingRoot: monorepoRoot,
  /** Sentry/OpenTelemetry instrumentation — must resolve from tower's node_modules (single version). */
  serverExternalPackages: ["import-in-the-middle", "require-in-the-middle"],
  turbopack: {
    /** Watch linked workspace packages under `packages/*` during dev. */
    root: monorepoRoot,
  },
  output: "standalone",
  /**
   * Auth surfaces carry secrets in the URL (`?invite=` operator token, `?token=` reset token,
   * invitationId). `no-referrer` keeps those from leaking to third parties via the Referer header
   * (history/logs/analytics) when the page loads sub-resources or the user follows an outbound link.
   */
  async headers() {
    const noReferrer = [{ key: "Referrer-Policy", value: "no-referrer" }];
    return [
      { source: "/sign-up", headers: noReferrer },
      { source: "/sign-in", headers: noReferrer },
      { source: "/request-access", headers: noReferrer },
      { source: "/forgot-password", headers: noReferrer },
      { source: "/reset-password", headers: noReferrer },
      { source: "/invitations/accept", headers: noReferrer },
    ];
  },
};

export default withPayload(
  withSentryConfig(nextConfig, {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    silent: !process.env.CI,
    widenClientFileUpload: true,
    disableLogger: true,
  })
);
