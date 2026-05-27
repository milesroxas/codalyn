export const CMS_SLOTS_FEATURE_NAME = "CMS Slots";

/** Designer canvas label on the list render target (stripped at runtime). */
export const CMS_SLOTS_LIST_TARGET_DESIGNER_LABEL = "Beacon - CMS Slot Target";

export const CMS_SLOTS_HOME_TILE_DESCRIPTION = "Unique layouts in collection templates";

export const CMS_SLOTS_AREA_NAV_LABEL = `${CMS_SLOTS_FEATURE_NAME} area`;

export const CMS_SLOTS_ADD_SLOT_LABEL = "Add Slot";

export const CMS_SLOTS_RENAME_SLOT_MENU_LABEL = "Rename";

export const CMS_SLOTS_RENAME_SLOT_DRAWER_TITLE = "Rename slot";

export const CMS_SLOTS_TOAST_LIST_RENAMED = "CMS slot renamed.";

/** Section heading for CMS slot lists already on the page (home grid). */
export const CMS_SLOTS_PUBLISHED_SECTION_LABEL = "Published Slots";

export const CMS_SLOTS_INSTALL_LABEL = "Install";

export const CMS_SLOTS_PAGE_LIST_ARIA_LABEL = "CMS slot lists on this page";

export const CMS_SLOTS_SCAN_ARIA_LABEL = "Scanning page for CMS slot lists";

export const CMS_SLOTS_SCAN_MESSAGE = "Scanning page for slot lists…";

export const CMS_SLOTS_OPENING_ARIA_LABEL = "Opening CMS slot";

export const CMS_SLOTS_OPENING_MESSAGE = "Opening slot list…";

export const CMS_SLOTS_ROUTE_TASK_ADDING_COMPONENT = "Adding component…";

export const CMS_SLOTS_ROUTE_TASK_SAVING_SLOT_CONFIG = "Saving slot config…";

export const CMS_SLOTS_ROUTE_TASK_CHECKING_CMS_FIELD = "Checking CMS field…";

export const CMS_SLOTS_ROUTE_TASK_UPDATING_LIST_TARGET = "Syncing list target…";

export const CMS_SLOTS_ROUTE_TASK_TAGGING_DATA_ATTRIBUTES = "Tagging attributes…";

export const CMS_SLOTS_ROUTE_TASK_ENTERING_COMPONENT = "Opening component…";

export const CMS_SLOTS_ROUTE_TASK_TAGGING_ELEMENTS = "Tagging elements…";

export const CMS_SLOTS_ROUTE_TASK_SAVING_EXPOSED_PROPS = "Saving props…";

export const CMS_SLOTS_ROUTE_TASK_CREATING_LIST_TARGET = "Creating list target…";

export const CMS_SLOTS_ROUTE_TASK_PLACING_ON_CANVAS = "Placing on canvas…";

export const CMS_SLOTS_ROUTE_TASK_FOCUSING_ON_CANVAS = "Focusing on canvas…";

export const CMS_SLOTS_ROUTE_TASK_OPENING_LIST_TARGET = "Opening list target…";

export const CMS_SLOTS_ROUTE_TASK_FINISHING = "Finishing up…";

export const CMS_SLOTS_ROUTE_TASK_REMOVING_LIST_TARGET = "Removing list target…";

export const CMS_SLOTS_ROUTE_TASK_CHECKING_LIST_TARGET = "Checking list target…";

export const CMS_SLOTS_ROUTE_TASK_REMOVING_COMPONENT = "Removing component…";

export const CMS_SLOTS_ROUTE_TASK_CREATING_LIST = "Creating slot list…";

export const CMS_SLOTS_ROUTE_TASK_RENAMING_LIST = "Renaming slot list…";

export const CMS_SLOTS_ROUTE_TASK_DELETING_LIST = "Deleting slot list…";

export const CMS_SLOTS_ROUTE_TASK_SYNCING_PAGE_SCRIPT = "Syncing page script…";

export const CMS_SLOTS_ROUTE_TASK_SAVING_COMPOSITION = "Saving composition…";

export const CMS_SLOTS_ROUTE_TASK_LOADING_COMPOSER_LISTS = "Loading lists…";

export const CMS_SLOTS_ROUTE_TASK_LINKING_CMS_FIELD = "Linking CMS field…";

import { BEACON_BACK_TO_HOME_ARIA_LABEL } from "@/shared/lib/beacon-feature-route-copy";

export const CMS_SLOTS_BACK_BUTTON_ARIA_LABEL = BEACON_BACK_TO_HOME_ARIA_LABEL;

export const CMS_SLOTS_SYNC_REQUIRES_INSTALL_TOOLTIP = `Install ${CMS_SLOTS_FEATURE_NAME} on this page first.`;

export const CMS_SLOTS_ENGINE_LIST_CHANGED_SYNC_REASON = "CMS slot list changed in Engine — sync page script.";

export const CMS_SLOTS_TOAST_LIST_TARGET_FOCUSED = "Selected the list target on the canvas.";

export const CMS_SLOTS_TOAST_LIST_TARGET_NOT_ON_CANVAS =
  "No list target found on this page. Place it on the canvas first.";

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

export const CMS_SLOTS_ENGINE_EDITING_TITLE = "Configure Slot Settings";

export const CMS_SLOTS_ENGINE_EDITING_DESCRIPTION = "Add components and expose props for this slot list.";

export const CMS_SLOTS_ENGINE_STEP_NAV_ARIA_LABEL = `${CMS_SLOTS_FEATURE_NAME} engine steps`;

export const CMS_SLOTS_ENGINE_SLOT_COMPONENT_LABEL = "Slot component";

export const CMS_SLOTS_ENGINE_LIST_TARGET_ON_CANVAS_TITLE = "On canvas";

export const CMS_SLOTS_ENGINE_COMPONENTS_LABEL = "Components";

export const CMS_SLOTS_ENGINE_COMPONENTS_EMPTY_TITLE = "No components yet";

export const CMS_SLOTS_ENGINE_COMPONENTS_EMPTY_DESCRIPTION = "Click the Add button to add components to this slot.";

export const CMS_SLOTS_ENGINE_ADD_COMPONENT_LABEL = "Add component";

export const CMS_SLOTS_ENGINE_COMPONENT_LIBRARY_TITLE = "Component library";

export const CMS_SLOTS_ENGINE_COMPONENT_LIBRARY_DESCRIPTION = "Search site components to add to this list.";

export const CMS_SLOTS_ENGINE_COMPONENT_LIBRARY_SEARCH_PLACEHOLDER = "Search components";

export const CMS_SLOTS_ENGINE_COMPONENT_LIBRARY_LOADING_ARIA_LABEL = "Loading components";

export const CMS_SLOTS_ENGINE_COMPONENT_LIBRARY_LIST_ARIA_LABEL = "Components";

export const CMS_SLOTS_ENGINE_SELECTED_COMPONENTS_ARIA_LABEL = "Selected components";

export const CMS_SLOTS_ENGINE_FOCUS_ON_CANVAS_HINT = "Jump to the list target on the canvas.";

export const CMS_SLOTS_ENGINE_PLACE_ON_CANVAS_HINT = "Place the list target on the canvas.";

export const CMS_SLOTS_ENGINE_SLOT_COMPONENT_PLACE_TITLE = "Not on canvas";

export const CMS_SLOTS_ENGINE_SLOT_COMPONENT_PLACE_GUIDE = "Place the slot on the page to continue setup.";

export const CMS_SLOTS_ENGINE_SLOT_COMPONENT_ON_CANVAS_GUIDE = "Select and use navigator to position it on the page.";

export const CMS_SLOTS_ENGINE_SELECT_ON_CANVAS_LABEL = "Select";

export const CMS_SLOTS_ENGINE_SELECT_ON_CANVAS_SELECTED_LABEL = "Selected";

export const CMS_SLOTS_ENGINE_SELECT_ON_CANVAS_PENDING_LABEL = "Selecting…";

export const CMS_SLOTS_ENGINE_CREATE_TARGET_HINT = "Add the hidden list target block to this page.";

export const CMS_SLOTS_ENGINE_LIST_TARGET_ABSENT_TITLE = "Not set up";

export const CMS_SLOTS_ENGINE_LIST_TARGET_ABSENT_DESCRIPTION =
  "This list needs a slot component before it can render on the page.";

export const CMS_SLOTS_ENGINE_LIST_TARGET_CHECKING_TITLE = "Checking status";

export const CMS_SLOTS_ENGINE_LIST_TARGET_CHECKING_DESCRIPTION =
  "Verifying whether the slot component is on this page.";

export const CMS_SLOTS_ENGINE_LIST_TARGET_UPDATING_TITLE = "Updating";

export const CMS_SLOTS_ENGINE_LIST_TARGET_UPDATING_DESCRIPTION = "Syncing slot component changes on this page.";

export const CMS_SLOTS_ENGINE_FOCUS_ON_CANVAS_LABEL = "Focus on canvas";

export const CMS_SLOTS_ENGINE_FOCUS_ON_CANVAS_PENDING_LABEL = "Focusing…";

export const CMS_SLOTS_ENGINE_PLACE_ON_CANVAS_LABEL = "Place on canvas";

export const CMS_SLOTS_ENGINE_PLACE_ON_CANVAS_PENDING_LABEL = "Placing…";

export const CMS_SLOTS_ENGINE_CREATE_TARGET_LABEL = "Create";

export const CMS_SLOTS_ENGINE_CREATE_TARGET_PENDING_LABEL = "Creating…";

export const CMS_SLOTS_ENGINE_LIST_TARGET_CHECKING_LABEL = "Checking…";

export const CMS_SLOTS_ENGINE_LIST_TARGET_UPDATING_LABEL = "Updating…";

export const CMS_SLOTS_ENGINE_REMOVE_TARGET_LABEL = "Remove target…";

export const CMS_SLOTS_ENGINE_BACK_TO_LIST_LABEL = "Back to list";
