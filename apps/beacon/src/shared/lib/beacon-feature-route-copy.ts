export const BEACON_BACK_TO_HOME_ARIA_LABEL = "Back to home";

export const IMAGE_UPLOAD_FEATURE_NAME = "Image Upload";

export const IMAGE_UPLOAD_HOME_TILE_DESCRIPTION = "Consistent asset workflow";

export const IMAGE_UPLOAD_CONTINUE_TO_ADD_LABEL = "Continue to add image";

export const IMAGE_UPLOAD_CONTINUE_TO_SAVE_LABEL = "Continue to export";

export const IMAGE_UPLOAD_SUCCESS_TITLE = "Image saved";

export const IMAGE_UPLOAD_SUCCESS_UPLOAD_ANOTHER_LABEL = "Upload another image";

export const IMAGE_UPLOAD_SUCCESS_BACK_HOME_LABEL = "Back to home";

/** Shown after a CMS field upload on a collection template — same Designer cache refresh as CMS Slots. */
export const IMAGE_UPLOAD_CMS_DESIGNER_REFRESH_HINT =
  "Switch to CMS in Webflow, then return to the Designer to see the updated image.";

export const IMAGE_UPLOAD_CMS_DESIGNER_REFRESH_READY =
  "You're back in the Designer — your image should appear on the canvas.";

export const IMAGE_UPLOAD_ADD_PRESET_LABEL = "Add preset";

/** Section heading for saved export presets (configure home grid). */
export const IMAGE_UPLOAD_PRESETS_SECTION_LABEL = "Export presets";

export const IMAGE_UPLOAD_PRESETS_LIST_ARIA_LABEL = "Export presets in workspace";

/** Section heading for the site-wide default preset (below export presets). */
export const IMAGE_UPLOAD_SITE_DEFAULT_SECTION_LABEL = "Site default";

export const IMAGE_UPLOAD_SITE_DEFAULT_LIST_ARIA_LABEL = "Site default preset in workspace";

export const IMAGE_UPLOAD_PRESETS_GUEST_MESSAGE = "Sign in to Tower to create and edit workspace presets.";

export const IMAGE_UPLOAD_PRESET_EXISTS_TITLE = "Preset already exists";

export function IMAGE_UPLOAD_PRESET_EXISTS_DESCRIPTION(displayName: string, dimensionsLabel: string): string {
  return `${displayName} (${dimensionsLabel}) is already saved for this scope. Edit it instead of creating another.`;
}

export const IMAGE_UPLOAD_PRESET_EDIT_EXISTING_LABEL = "Edit preset";

export const IMAGE_UPLOAD_PRESET_CURRENT_SECTION_LABEL = "Current preset";

export const IMAGE_UPLOAD_PRESET_CREATE_SECTION_LABEL = "Create preset";

export const IMAGE_UPLOAD_PRESET_CREATE_INTRO = "Choose the type of preset you want to create for this image.";

export const IMAGE_UPLOAD_PRESET_ON_SURFACE_SECTION_LABEL = "Presets on this surface";

export const IMAGE_UPLOAD_PRESET_ADD_SCOPE_SECTION_LABEL = "Add preset for";

export function IMAGE_UPLOAD_PRESET_ADD_SCOPE_LABEL(scopeLabel: string): string {
  return `Add ${scopeLabel.toLowerCase()}`;
}
