/**
 * Per-theme home-launcher tile background vars (`background-image: var(--beacon-home-tile-…)`).
 * The underlying `--beacon-app-bg-*` / `--beacon-tile-*-url` values are declared statically in
 * `styles/globals.css` (`:root` / `.dark`); nothing writes them at runtime.
 */
export const BEACON_HOME_TILE_CSS_VARS = {
  cmsSlot: "--beacon-home-tile-cms-bg",
  imageUpload: "--beacon-home-tile-image-upload-bg",
} as const;
