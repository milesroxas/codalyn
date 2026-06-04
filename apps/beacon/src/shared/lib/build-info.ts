export type BeaconReleaseStage = "early-access" | "stable";

export const BEACON_EARLY_ACCESS_LABEL = "Early access";

export function parseBeaconReleaseStage(raw: string | undefined): BeaconReleaseStage {
  const normalized = raw?.trim().toLowerCase();
  if (normalized === "stable" || normalized === "ga" || normalized === "general-availability") {
    return "stable";
  }
  return "early-access";
}

export const buildInfo = {
  version: __APP_VERSION__,
  channel: __BUILD_CHANNEL__ as "production" | "development",
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
  if (buildInfo.releaseStage === "early-access") {
    segments.push(BEACON_EARLY_ACCESS_LABEL);
  }
  if (buildInfo.channel !== "production") {
    segments.push(buildInfo.channel);
    const recipient = buildInfo.recipient.trim();
    if (recipient && recipient !== "internal") {
      segments.push(recipient);
    }
  }
  return segments;
}

/** User-facing version stamp for settings and support (semver + release stage; build metadata in dev). */
export function getBeaconAppVersionDisplay(): BeaconAppVersionDisplay {
  return {
    primary: beaconAppVersionPrimarySegments().join(" · "),
    secondary: buildInfo.channel === "production" ? null : `Built ${new Date(buildInfo.buildTime).toLocaleString()}`,
  };
}
