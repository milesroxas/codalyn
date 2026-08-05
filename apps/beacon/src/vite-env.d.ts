/// <reference types="vite/client" />
/// <reference types="@webflow/designer-extension-typings" />

declare const __APP_VERSION__: string;
declare const __BUILD_CHANNEL__: string;
declare const __BUILD_TIME__: string;
declare const __BEACON_TOWER_ORIGIN__: string;

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
  readonly VITE_POSTHOG_KEY?: string;
  readonly VITE_POSTHOG_HOST?: string;
}
