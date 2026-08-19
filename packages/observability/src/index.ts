/** Codalyn apps that share one PostHog project and one Sentry project. */
export type CodalynApp = "tower" | "beacon" | "flint";

/** Build / deployment channel shared across Tower (Vercel) and extension bundles (Vite mode). */
export type CodalynBuildChannel = "production" | "development" | "preview";

/** Shared PostHog project (Flint). Filter events by the `app` super property. */
export const CODALYN_POSTHOG_KEY = "phc_kJd34pP5g9zgEp8Q9dAIGnTx6vT8Vlafo2C3bzMfcR4";
export const CODALYN_POSTHOG_HOST = "https://us.i.posthog.com";

/** Shared Sentry project for all Codalyn apps. Filter issues by the `app` tag. */
export const CODALYN_SENTRY_DSN =
  "https://c993b67496005cf2368a92f96ea607e2@o4510105496584192.ingest.us.sentry.io/4510105587941376";

/**
 * Normalize raw env values (`VERCEL_ENV`, Vite `--mode`, `NODE_ENV`, etc.) to a Codalyn channel.
 * Unknown values default to `development`.
 */
export function resolveCodalynBuildChannel(raw?: string): CodalynBuildChannel {
  const normalized = raw?.trim().toLowerCase();
  switch (normalized) {
    case "production":
    case "prod":
      return "production";
    case "preview":
      return "preview";
    case "development":
    case "dev":
      return "development";
    default:
      return "development";
  }
}

/** Sentry environment for the shared project — e.g. `beacon-production`, `tower-preview`. */
export function buildCodalynSentryEnvironment(app: CodalynApp, channel: CodalynBuildChannel): string {
  return `${app}-${channel}`;
}

/** Tags attached to every Sentry event for cross-app and cross-channel filters. */
export function buildCodalynSentryTags(
  app: CodalynApp,
  channel: CodalynBuildChannel
): Record<"app" | "build_channel", string> {
  return { app, build_channel: channel };
}

export function resolveCodalynSentryTracesSampleRate(channel: CodalynBuildChannel): number {
  return channel === "production" ? 0.1 : 1;
}

/**
 * Privacy-hardened PostHog options for Webflow Designer Extension bundles.
 * Marketplace guidelines restrict data collection to disclosed, operational telemetry and bar
 * non-authentication iframes — so no autocapture, no session recording, no surveys/toolbar, no
 * lazy-loaded external scripts (recorder/surveys would otherwise be fetched off-origin), and no
 * tracking identifiers persisted to storage.
 */
export const CODALYN_EXTENSION_POSTHOG_PRIVACY_OPTIONS = {
  autocapture: false,
  capture_pageview: false,
  capture_pageleave: false,
  // Defence in depth only: the session-recording controller itself (rrweb loader, recorder API) is
  // excised from the installed posthog-js by the pnpm patch (`patches/posthog-js@1.369.3.patch`,
  // App Review Preflight "Fingerprinting & Session Replay", 2026-08-19), so no recorder can start
  // regardless of this flag. Kept so a future SDK bump that loses the excision still ships disabled.
  disable_session_recording: true,
  disable_surveys: true,
  disable_external_dependency_loading: true,
  // Heatmaps ship inside the posthog core bundle, so `disable_external_dependency_loading` does NOT hold
  // them back: left unset, `$heatmaps_enabled_server_side` from the remote-config response could switch on
  // document-level click/mousemove capture inside the Designer iframe with no code change and no re-review.
  // Pinned off locally so the "no autocapture" disclosure cannot be invalidated from the PostHog project UI.
  capture_heatmaps: false,
  enable_heatmaps: false,
  // Campaign/UTM parameters are parsed off the extension iframe URL by default. Not used, not disclosed.
  save_campaign_params: false,
  // Remote config is the delivery channel for the server-side toggles above (heatmaps, conversations,
  // product tours). Disabling it keeps the shipped bundle's behavior identical to the reviewed behavior.
  advanced_disable_flags: true,
  advanced_disable_feature_flags: true,
  // Web experiments could apply remote HTML/styles to the page. Off by default in this posthog-js
  // version, but pinned here per Marketplace round-6 so a future SDK default change cannot re-enable
  // them; the bundled implementation is additionally stubbed out via the posthog-js pnpm patch
  // (no fetch, no DOM transforms remain in the shipped code).
  disable_web_experiments: true,
  // No anonymous person profiles: a profile is only ever created for an explicitly identified user, and
  // the extension never calls `identify`.
  person_profiles: "identified_only",
  persistence: "memory",
  // The extension iframe's referrer is Designer/site context — never collected. Referrer
  // analytics are not used or disclosed, so `$referrer`/`$referring_domain` stay off.
  save_referrer: false,
} as const;

export type CodalynPostHogSuperProperties = {
  app: CodalynApp;
  environment: CodalynBuildChannel;
  app_version?: string;
  build_time?: string;
  bundle_recipient?: string;
  release_stage?: string;
};

/** Super properties registered on every PostHog event (omits undefined optional fields). */
export function buildCodalynPostHogSuperProperties(props: CodalynPostHogSuperProperties): Record<string, string> {
  const superProperties: Record<string, string> = {
    app: props.app,
    environment: props.environment,
  };

  if (props.app_version) {
    superProperties.app_version = props.app_version;
  }
  if (props.build_time) {
    superProperties.build_time = props.build_time;
  }
  if (props.bundle_recipient) {
    superProperties.bundle_recipient = props.bundle_recipient;
  }
  if (props.release_stage) {
    superProperties.release_stage = props.release_stage;
  }

  return superProperties;
}

function isDisabled(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === "0" || normalized === "false" || normalized === "off";
}

/**
 * Resolve PostHog key. Env override wins when non-empty.
 * When unset or empty, uses the shared Codalyn project key.
 * Set to `0`, `false`, or `off` to disable tracking.
 */
export function resolvePostHogKey(override?: string): string | undefined {
  if (isDisabled(override)) {
    return undefined;
  }
  const value = override?.trim();
  return value || CODALYN_POSTHOG_KEY;
}

/**
 * Resolve Sentry DSN. Env override wins when non-empty.
 * When unset or empty, uses the shared Codalyn project DSN.
 * Set to `0`, `false`, or `off` to disable monitoring.
 */
export function resolveSentryDsn(override?: string): string | undefined {
  if (isDisabled(override)) {
    return undefined;
  }
  const value = override?.trim();
  return value || CODALYN_SENTRY_DSN;
}

export function resolvePostHogHost(override?: string): string {
  return override?.trim() || CODALYN_POSTHOG_HOST;
}
