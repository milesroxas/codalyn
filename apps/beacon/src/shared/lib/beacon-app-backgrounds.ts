/** Paths relative to `import.meta.env.BASE_URL` (files live in `public/images/`). */
const BEACON_APP_BACKGROUND_PATHS = {
  light: "images/light-app-bg.webp",
  dark: "images/dark-app-bg.webp",
} as const;

/**
 * Resolved per-theme tile backgrounds for the home launcher (`background-image: var(--beacon-home-tile-…)`).
 * Wiring: injected `--beacon-tile-{cms|image-upload}-{light|dark}-url` in `injectBeaconAppBackgroundCssVars()` →
 * `globals.css` maps light/dark to these names under `:root` / `.dark`.
 */
export const BEACON_HOME_TILE_CSS_VARS = {
  cmsSlot: "--beacon-home-tile-cms-bg",
  imageUpload: "--beacon-home-tile-image-upload-bg",
} as const;

/** Home launcher tile art (`public/images/`); filenames pair with {@link BEACON_HOME_TILE_CSS_VARS}. */
const BEACON_HOME_TILE_BACKGROUND_PATHS = {
  cmsSlot: {
    light: "images/light-tile-cms-slot.webp",
    dark: "images/dark-tile-cms-slot.webp",
  },
  imageUpload: {
    light: "images/light-tile-image-upload.webp",
    dark: "images/dark-tile-image-upload.webp",
  },
} as const;

function publicAssetUrl(path: string): string {
  const base = import.meta.env.BASE_URL;
  return `${base.endsWith("/") ? base : `${base}/`}${path}`;
}

/** Sets Beacon shell/tile `--beacon-*` URL vars consumed by `globals.css`. Run on startup. */
export function injectBeaconAppBackgroundCssVars(): void {
  const root = document.documentElement;

  root.style.setProperty("--beacon-app-bg-light", `url("${publicAssetUrl(BEACON_APP_BACKGROUND_PATHS.light)}")`);
  root.style.setProperty("--beacon-app-bg-dark", `url("${publicAssetUrl(BEACON_APP_BACKGROUND_PATHS.dark)}")`);

  root.style.setProperty(
    "--beacon-tile-cms-light-url",
    `url("${publicAssetUrl(BEACON_HOME_TILE_BACKGROUND_PATHS.cmsSlot.light)}")`
  );
  root.style.setProperty(
    "--beacon-tile-cms-dark-url",
    `url("${publicAssetUrl(BEACON_HOME_TILE_BACKGROUND_PATHS.cmsSlot.dark)}")`
  );
  root.style.setProperty(
    "--beacon-tile-image-upload-light-url",
    `url("${publicAssetUrl(BEACON_HOME_TILE_BACKGROUND_PATHS.imageUpload.light)}")`
  );
  root.style.setProperty(
    "--beacon-tile-image-upload-dark-url",
    `url("${publicAssetUrl(BEACON_HOME_TILE_BACKGROUND_PATHS.imageUpload.dark)}")`
  );
}
