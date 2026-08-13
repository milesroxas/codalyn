/**
 * User-facing disclosure copy for AVIF conversion via Codalyn Tower.
 *
 * Marketplace privacy requirement: AVIF encoding sends the cropped image to Tower
 * (an external, Codalyn-operated service) over HTTPS. That must be (1) disclosed
 * visibly at the point of use and (2) gated behind an explicit user opt-in. Keep
 * this copy accurate to the actual network behavior in `encode-image-blob.ts`.
 */

export const AVIF_TOWER_CONSENT_TITLE = "Send images to Codalyn Tower for AVIF?";

export const AVIF_TOWER_CONSENT_DESCRIPTION =
  "AVIF encoding isn't available inside the Designer, so Beacon sends your cropped image to Codalyn's Tower service (tower.codalyn.app) over HTTPS for conversion. Images are processed in memory and never stored. Nothing is sent until you enable this, and you can turn it off anytime in Settings → Privacy.";

export const AVIF_TOWER_CONSENT_CONFIRM_LABEL = "Enable AVIF conversion";

export const AVIF_TOWER_CONSENT_CANCEL_LABEL = "Keep WebP";

/** Shown persistently (not tooltip-only) whenever AVIF is the active export format. */
export const AVIF_TOWER_ACTIVE_DISCLOSURE =
  "AVIF sends this image to Codalyn Tower over HTTPS for conversion (processed in memory, not stored). Manage in Settings → Privacy.";

export const AVIF_PRESET_CONSENT_TITLE = "This preset exports AVIF";

export const AVIF_PRESET_CONSENT_DESCRIPTION =
  "AVIF conversion sends the image to Codalyn Tower over HTTPS. Until you enable it, exports use WebP encoded entirely in the Designer.";

/** Settings → Privacy toggle. */
export const AVIF_TOWER_SETTINGS_TOGGLE_LABEL = "Convert to AVIF via Codalyn Tower";
