export type BeaconReleaseStage = "early-access" | "stable";

/**
 * Release stage is build metadata for telemetry only — it is never shown to users. It also defaults to
 * `stable`: a shipped Marketplace app must present itself as complete, and defaulting to `early-access`
 * meant any build without the env var stamped a pre-release label across the product.
 */
export function parseBeaconReleaseStage(raw: string | undefined): BeaconReleaseStage {
  return raw?.trim().toLowerCase() === "early-access" ? "early-access" : "stable";
}

export const buildInfo = {
  version: __APP_VERSION__,
  channel: __BUILD_CHANNEL__ as "production" | "development" | "preview",
  buildTime: __BUILD_TIME__,
  recipient: import.meta.env.VITE_BUNDLE_RECIPIENT ?? "internal",
  releaseStage: parseBeaconReleaseStage(import.meta.env.VITE_BEACON_RELEASE_STAGE),
};

export type BeaconAppVersionDisplay = {
  primary: string;
  secondary: string | null;
};

function beaconAppVersionPrimarySegments(): string[] {
  const segments = [`Beacon v${buildInfo.version}`];
  if (buildInfo.channel !== "production") {
    segments.push(buildInfo.channel);
    const recipient = buildInfo.recipient.trim();
    if (recipient && recipient !== "internal") {
      segments.push(recipient);
    }
  }
  return segments;
}

/** User-facing version stamp for settings and support (semver; build metadata on non-production channels). */
export function getBeaconAppVersionDisplay(): BeaconAppVersionDisplay {
  return {
    primary: beaconAppVersionPrimarySegments().join(" · "),
    secondary: buildInfo.channel === "production" ? null : `Built ${new Date(buildInfo.buildTime).toLocaleString()}`,
  };
}
