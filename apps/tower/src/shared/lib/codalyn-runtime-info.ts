import { type CodalynBuildChannel, resolveCodalynBuildChannel } from "@codalyn/observability";
import packageJson from "../../../package.json";

function readBuildChannel(): CodalynBuildChannel {
  return resolveCodalynBuildChannel(
    process.env.VERCEL_ENV ?? process.env.NEXT_PUBLIC_CODALYN_BUILD_CHANNEL ?? process.env.NODE_ENV
  );
}

export const codalynRuntimeInfo = {
  app: "tower" as const,
  version: packageJson.version,
  environment: readBuildChannel(),
};
