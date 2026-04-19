import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.join(__dirname, "../..");

const nextConfig: NextConfig = {
  transpilePackages: ["@codalyn/webflow-kit"],
  /** Trace files from the monorepo root so Docker `standalone` bundles workspace deps correctly. */
  outputFileTracingRoot: monorepoRoot,
  output: "standalone",
};

export default nextConfig;
