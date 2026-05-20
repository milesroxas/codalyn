/// <reference types="vite/client" />
/// <reference types="@webflow/designer-extension-typings" />

// Note: The AnyElement interface is now provided by @webflow/designer-extension-typings
// and doesn't need to be redefined here

declare const __APP_VERSION__: string;
declare const __BUILD_CHANNEL__: string;
declare const __BUILD_TIME__: string;

interface ImportMetaEnv {
  readonly VITE_POSTHOG_KEY?: string;
  readonly VITE_POSTHOG_HOST?: string;
  readonly VITE_SENTRY_DSN?: string;
}
