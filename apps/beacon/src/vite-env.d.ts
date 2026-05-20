/// <reference types="vite/client" />
/// <reference types="@webflow/designer-extension-typings" />

declare const __APP_VERSION__: string;
declare const __BUILD_CHANNEL__: string;
declare const __BUILD_TIME__: string;

interface ImportMetaEnv {
  readonly VITE_BUNDLE_RECIPIENT?: string;
  readonly VITE_TOWER_ORIGIN?: string;
  readonly VITE_BEACON_API_KEY?: string;
  /** When `"true"` in production builds, enables the CMS Slots surface (`#/cms-slots/*`). */
  readonly VITE_CMS_SLOTS_SURFACE_ENABLED?: string;
  readonly VITE_POSTHOG_KEY?: string;
  readonly VITE_POSTHOG_HOST?: string;
  readonly VITE_SENTRY_DSN?: string;
}
