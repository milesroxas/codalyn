/// <reference types="vite/client" />
/// <reference types="@webflow/designer-extension-typings" />

declare const __APP_VERSION__: string;
declare const __BUILD_CHANNEL__: string;
declare const __BUILD_TIME__: string;

interface ImportMetaEnv {
  readonly VITE_BUNDLE_RECIPIENT?: string;
  readonly VITE_TOWER_ORIGIN?: string;
  readonly VITE_BEACON_API_KEY?: string;
  /** When `true` or `1`, enables optional Beacon surfaces (CMS editor, header nav between Images and Editor). */
  readonly VITE_BEACON_EXTENDED_FEATURES?: string;
  /** @deprecated Prefer `VITE_BEACON_EXTENDED_FEATURES`; same behavior when `true` or `1`. */
  readonly VITE_BEACON_CMS_EDITOR?: string;
}
