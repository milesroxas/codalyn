export const CMS_SLOTS_FEATURE_NAME = "CMS Slots";

/** Designer canvas label on the list render target (stripped at runtime). */
export const CMS_SLOTS_LIST_TARGET_DESIGNER_LABEL = "Beacon - CMS Slot Target";

export const CMS_SLOTS_HOME_TILE_DESCRIPTION = "Unique layouts in collection templates";

export const CMS_SLOTS_AREA_NAV_LABEL = `${CMS_SLOTS_FEATURE_NAME} area`;

export const CMS_SLOTS_ADD_SLOT_LABEL = "Add Slot";

/** Section heading for CMS slot lists already on the page (home grid). */
export const CMS_SLOTS_PUBLISHED_SECTION_LABEL = "Published Slots";

export const CMS_SLOTS_INSTALL_LABEL = "Install";

export const CMS_SLOTS_PAGE_LIST_ARIA_LABEL = "CMS slot lists on this page";

export const CMS_SLOTS_SCAN_ARIA_LABEL = "Scanning page for CMS slot lists";

export const CMS_SLOTS_OPENING_ARIA_LABEL = "Opening CMS slot";

import { BEACON_BACK_TO_HOME_ARIA_LABEL } from "@/shared/lib/beacon-feature-route-copy";

export const CMS_SLOTS_BACK_BUTTON_ARIA_LABEL = BEACON_BACK_TO_HOME_ARIA_LABEL;

export const CMS_SLOTS_SYNC_REQUIRES_INSTALL_TOOLTIP = `Install ${CMS_SLOTS_FEATURE_NAME} on this page first.`;

export const CMS_SLOTS_ENGINE_LIST_CHANGED_SYNC_REASON = "CMS slot list changed in Engine — sync page script.";

export const CMS_SLOTS_TOAST_LIST_CREATED = "CMS slot list created.";

export const CMS_SLOTS_TOAST_LIST_REMOVED = "CMS slot list removed.";

export const CMS_SLOTS_TOAST_LIST_REMOVED_PAGE_CLEARED = "CMS slot list removed. CMS Slots page install cleared.";

export const CMS_SLOTS_DELETE_DIALOG_TITLE = "Delete this CMS slot list?";

export const CMS_SLOTS_CMS_FIELD_LINK_DIALOG_TITLE = "Refresh CMS in Webflow";

export const CMS_SLOTS_CMS_FIELD_LINK_DIALOG_DESCRIPTION =
  "A new CMS Plain Text field was created for this beacon list. Switch to CMS in Webflow, then return to the Designer so the field appears for binding.";

export const CMS_SLOTS_CMS_FIELD_LINK_DIALOG_WAITING = "After you return to the Designer, use Link to CMS field below.";

export const CMS_SLOTS_CMS_FIELD_LINK_DIALOG_READY =
  "You switched views — link the list target Text prop to the new CMS field.";

export const CMS_SLOTS_CMS_FIELD_LINK_RETRY_LABEL = "Link to CMS field";

export const CMS_SLOTS_CMS_FIELD_LINK_TOAST_SUCCESS = "List target linked to the CMS field.";

export const CMS_SLOTS_CMS_FIELD_NOT_VISIBLE_NOTIFY =
  "Could not confirm the CMS Plain Text field on this collection. Check your Webflow connection in Tower, then try creating the list target again.";

export const CMS_SLOTS_UNINSTALL_PAGE_LABEL = `Also uninstall ${CMS_SLOTS_FEATURE_NAME} on this page`;

/** Composer empty state when an editor has no slot lists to open on this page. */
export const CMS_SLOTS_EDITOR_NO_SLOTS_TITLE = "No Slots Found";

export const CMS_SLOTS_EDITOR_NO_SLOTS_DESCRIPTION = "Contact your team admin or site designer to enable this feature";

/** Action label on the home tile and route gate when CMS Slots is not on a collection template. */
export const CMS_SLOTS_COLLECTION_TEMPLATE_PROMPT_LABEL = "Open a CMS collection template";

export const CMS_SLOTS_COLLECTION_TEMPLATE_PROMPT_NOTIFY_MESSAGE =
  "In the Designer, open Pages and select a CMS collection template.";

/** Screen-reader label for the collection-template prompt control. */
export const CMS_SLOTS_REQUIRES_COLLECTION_TEMPLATE_ARIA_LABEL = `${CMS_SLOTS_FEATURE_NAME}: ${CMS_SLOTS_COLLECTION_TEMPLATE_PROMPT_LABEL}`;

export const CMS_SLOTS_ENGINE_MAIN_TITLE = "Engine";

export const CMS_SLOTS_ENGINE_MAIN_DESCRIPTION = "Set up slots, components, and fields for this collection.";

export const CMS_SLOTS_COMPOSER_MAIN_TITLE = "Composer";

export const CMS_SLOTS_COMPOSER_MAIN_DESCRIPTION = "Pick a list to order parts and set content.";

export const CMS_SLOTS_ENGINE_EDITING_TITLE = "Editing list";

export const CMS_SLOTS_ENGINE_EDITING_DESCRIPTION = "Add components and expose props for this slot list.";

export const CMS_SLOTS_ENGINE_CURRENT_LIST_LABEL = "Current list";

export const CMS_SLOTS_ENGINE_LIST_TARGET_META = "List target";

export const CMS_SLOTS_ENGINE_FOCUS_ON_CANVAS_HINT = "Jump to the list target on the canvas.";

export const CMS_SLOTS_ENGINE_PLACE_ON_CANVAS_HINT = "Place the list target on the canvas.";

export const CMS_SLOTS_ENGINE_CREATE_TARGET_HINT = "Add the hidden list target block to this page.";

export const CMS_SLOTS_ENGINE_LIST_TARGET_STATUS_HINT = "Checking list target on this page.";

export const CMS_SLOTS_ENGINE_FOCUS_ON_CANVAS_LABEL = "Focus on canvas";

export const CMS_SLOTS_ENGINE_FOCUS_ON_CANVAS_PENDING_LABEL = "Focusing…";

export const CMS_SLOTS_ENGINE_PLACE_ON_CANVAS_LABEL = "Place on canvas";

export const CMS_SLOTS_ENGINE_PLACE_ON_CANVAS_PENDING_LABEL = "Placing…";

export const CMS_SLOTS_ENGINE_CREATE_TARGET_LABEL = "Create target";

export const CMS_SLOTS_ENGINE_CREATE_TARGET_PENDING_LABEL = "Creating…";

export const CMS_SLOTS_ENGINE_LIST_TARGET_CHECKING_LABEL = "Checking…";

export const CMS_SLOTS_ENGINE_LIST_TARGET_UPDATING_LABEL = "Updating…";

export const CMS_SLOTS_ENGINE_REMOVE_TARGET_LABEL = "Remove target…";

export function cmsSlotsEngineListTargetActionsAriaLabel(listName: string): string {
  return `List target actions for ${listName}`;
}

export const CMS_SLOTS_ENGINE_BACK_TO_LIST_LABEL = "Back to list";
