/// <reference types="vite/client" />
/// <reference types="@webflow/designer-extension-typings" />

declare const __APP_VERSION__: string;
declare const __BUILD_CHANNEL__: string;
declare const __BUILD_TIME__: string;
declare const __BEACON_TOWER_ORIGIN__: string;
/**
 * Build-time gate for the quality-compare popout (see vite.config.ts). `false` unless
 * `VITE_QUALITY_COMPARE_POPOUT_ENABLED=true`: the popout entry is not built and the opener path is
 * dead-code-eliminated, so Marketplace bundles carry no trace of the withheld feature.
 */
declare const __QUALITY_COMPARE_POPOUT_ENABLED__: boolean;

interface ImportMetaEnv {
  readonly VITE_BUNDLE_RECIPIENT?: string;
  readonly VITE_TOWER_ORIGIN?: string;
  readonly VITE_BEACON_API_KEY?: string;
  /**
   * Telemetry-only build metadata (`release_stage`); never shown to users. Defaults to `stable` —
   * only an explicit `early-access` opts into the pre-release stage.
   */
  readonly VITE_BEACON_RELEASE_STAGE?: string;
  /** Kill switch for the CMS Slots surface (`#/cms-slots/*`): enabled unless set to `"false"`. */
  readonly VITE_CMS_SLOTS_SURFACE_ENABLED?: string;
  /**
   * Enable switch for the quality-compare popout: off unless exactly `"true"`. Deliberately the
   * opposite polarity of the CMS Slots kill switch — the popout is withheld from Marketplace
   * bundles for now, and "off" hides the feature completely (no dead UI), so a clean checkout
   * building with it absent is the *intended* release state. Release builds fail if this is on
   * (FORBIDDEN_RELEASE_ENV in scripts/build-cli.mjs).
   */
  readonly VITE_QUALITY_COMPARE_POPOUT_ENABLED?: string;
  readonly VITE_POSTHOG_KEY?: string;
  readonly VITE_POSTHOG_HOST?: string;
}
