/// <reference types="vite/client" />
/// <reference types="@webflow/designer-extension-typings" />

declare const __APP_VERSION__: string;
declare const __BUILD_CHANNEL__: string;
declare const __BUILD_TIME__: string;

interface ImportMetaEnv {
  readonly VITE_BUNDLE_RECIPIENT?: string;
  readonly VITE_TOWER_ORIGIN?: string;
  readonly VITE_BEACON_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
