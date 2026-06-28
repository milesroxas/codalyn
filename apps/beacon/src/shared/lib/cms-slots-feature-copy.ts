export const CMS_SLOTS_FEATURE_NAME = "CMS Slots";

/** Designer canvas label on the list render target (stripped at runtime). */
export const CMS_SLOTS_LIST_TARGET_DESIGNER_LABEL = "Beacon - CMS Slot Target";

export const CMS_SLOTS_HOME_TILE_DESCRIPTION = "Unique layouts in collection templates";

export const CMS_SLOTS_AREA_NAV_LABEL = `${CMS_SLOTS_FEATURE_NAME} area`;

export const CMS_SLOTS_ADD_SLOT_LABEL = "Add Slot";

export const CMS_SLOTS_RENAME_SLOT_MENU_LABEL = "Rename";

export const CMS_SLOTS_RENAME_SLOT_DIALOG_TITLE = "Rename slot";

export const CMS_SLOTS_TOAST_LIST_RENAMED = "CMS slot renamed.";

/** Section heading for CMS slot lists already on the page (home grid). */
export const CMS_SLOTS_PUBLISHED_SECTION_LABEL = "Published Slots";

/** Section heading for slot lists available to open in Composer. */
export const CMS_SLOTS_COMPOSER_EDITABLE_SECTION_LABEL = "Editable Slots";

export const CMS_SLOTS_INSTALL_LABEL = "Install";

export const CMS_SLOTS_INSTALL_PENDING_LABEL = "Installing…";

export const CMS_SLOTS_PRE_INSTALL_TITLE = "Not installed";

export const CMS_SLOTS_PRE_INSTALL_DESCRIPTION = `Install ${CMS_SLOTS_FEATURE_NAME} on this collection template to continue.`;

/** Composer empty state when a designer must install from Designer before composing. */
export const CMS_SLOTS_COMPOSER_INSTALL_IN_DESIGNER_TITLE = "Not installed";

export const CMS_SLOTS_COMPOSER_INSTALL_IN_DESIGNER_DESCRIPTION = `Install ${CMS_SLOTS_FEATURE_NAME} in Designer to compose slot content. Click the button below to install.`;

/** Composer empty state when Designer is installed but no slot component is configured and synced yet. */
export const CMS_SLOTS_COMPOSER_DESIGNER_NOT_READY_TITLE = "Not ready";

export const CMS_SLOTS_COMPOSER_DESIGNER_NOT_READY_DESCRIPTION =
  "Configure, expose, and sync at least one component in Designer to compose slot content.";

export const CMS_SLOTS_ROUTE_TASK_CHECKING_INSTALL = "Checking install…";

export const CMS_SLOTS_ROUTE_TASK_CREATING_INSTALL = "Creating install…";

export const CMS_SLOTS_ROUTE_TASK_MOVING_SLOT_LISTS = "Moving slot lists…";

export const CMS_SLOTS_PAGE_LIST_ARIA_LABEL = "CMS slot lists on this page";

export const CMS_SLOTS_SCAN_ARIA_LABEL = "Scanning page for CMS slot lists";

export const CMS_SLOTS_SCAN_MESSAGE = "Scanning page for slot lists…";

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

export const CMS_SLOTS_ROUTE_TASK_REMOVING_COMPONENT = "Removing component…";

export const CMS_SLOTS_ROUTE_TASK_CREATING_LIST = "Creating slot list…";

export const CMS_SLOTS_ROUTE_TASK_RENAMING_LIST = "Renaming slot list…";

export const CMS_SLOTS_ROUTE_TASK_DELETING_LIST = "Deleting slot list…";

export const CMS_SLOTS_ROUTE_TASK_SYNCING_PAGE_SCRIPT = "Syncing page script…";

export const CMS_SLOTS_ROUTE_TASK_SAVING_COMPOSITION = "Saving composition…";

export const CMS_SLOTS_ROUTE_TASK_APPLYING_COMPOSITION = "Applying composition…";

export const CMS_SLOTS_ROUTE_TASK_SAVING_CMS_LAYOUT = "Saving layout to CMS…";

export const CMS_SLOTS_ROUTE_TASK_LINKING_CMS_FIELD = "Linking CMS field…";

export const CMS_SLOTS_SYNC_REQUIRES_INSTALL_TOOLTIP = `Install ${CMS_SLOTS_FEATURE_NAME} on this page first.`;

export const CMS_SLOTS_DESIGNER_LIST_CHANGED_SYNC_REASON = "CMS slot list changed in Designer — sync page script.";

export const CMS_SLOTS_TOAST_LIST_TARGET_FOCUSED = "Selected the list target on the canvas.";

export const CMS_SLOTS_TOAST_LIST_TARGET_NOT_ON_CANVAS =
  "No list target found on this page. Place it on the canvas first.";

export const CMS_SLOTS_TOAST_LIST_CREATED = "CMS slot list created.";

export const CMS_SLOTS_TOAST_LIST_REMOVED = "CMS slot list removed.";

export const CMS_SLOTS_TOAST_UNINSTALL_RUNTIME_REMOVED =
  "CMS slot list removed. Page install cleared and footer beacon script removed. Publish the site to apply on the live site.";

export const CMS_SLOTS_TOAST_UNINSTALL_RUNTIME_NOT_FOUND =
  "CMS slot list removed. Page install cleared. No beacon footer script was on this page.";

export const CMS_SLOTS_TOAST_UNINSTALL_RUNTIME_SKIPPED_NO_TOWER =
  "CMS slot list removed. Page install cleared, but the footer beacon script was not removed because Tower is not configured. Remove it manually in Page settings → Custom code.";

export const CMS_SLOTS_TOAST_UNINSTALL_RUNTIME_FAILED_PREFIX =
  "CMS slot list removed. Page install cleared, but the footer beacon script could not be removed:";

export const CMS_SLOTS_TOAST_UNINSTALL_RUNTIME_MANUAL_SUFFIX = "Remove it manually in Page settings → Custom code.";

export const CMS_SLOTS_TOAST_LIST_REMOVED_INSTALL_REMAINS =
  'CMS slot list removed. The page install and footer beacon script remain on this page. Delete the last list with "Also uninstall CMS Slots on this page" to remove them, or remove the footer script manually in Page settings → Custom code.';

export const CMS_SLOTS_DELETE_DIALOG_TITLE = "Delete this CMS slot list?";

export const CMS_SLOTS_CMS_FIELD_LINK_DIALOG_TITLE = "Refresh CMS in Webflow";

export const CMS_SLOTS_CMS_FIELD_LINK_DIALOG_HINT =
  "In Webflow, open CMS to confirm the new field was created. Return to the Designer when you're ready to link it.";

export const CMS_SLOTS_CMS_FIELD_LINK_DIALOG_READY =
  "You're back in the Designer. Click below to link the list target to the CMS field. If you don't see the field, refresh this tab and try again.";

export const CMS_SLOTS_CMS_FIELD_LINK_RETRY_LABEL = "Link to CMS field";

export const CMS_SLOTS_CMS_FIELD_LINK_PENDING_LABEL = "Linking…";

export const CMS_SLOTS_LIST_TARGET_CMS_FIELD_LINK_DIALOG_TITLE = "Link CMS field";

export const CMS_SLOTS_LIST_TARGET_CMS_FIELD_LINK_DIALOG_DESCRIPTION =
  "The slot component Text prop is not linked to the CMS field. Link it to continue setup. If linking fails, refresh this Designer tab and try again.";

export const CMS_SLOTS_CMS_FIELD_LINK_TOAST_SUCCESS = "List target linked to the CMS field.";

export const CMS_SLOTS_CMS_FIELD_NOT_VISIBLE_NOTIFY =
  "Could not confirm the CMS Plain Text field on this collection. Check your Webflow connection in Tower, then try creating the list target again.";

export const CMS_SLOTS_UNINSTALL_PAGE_LABEL = `Also uninstall ${CMS_SLOTS_FEATURE_NAME} on this page`;

/** Shown when deleting the last list without also uninstalling the page install. */
export const CMS_SLOTS_UNINSTALL_PAGE_HINT =
  "The footer beacon script, hidden page install, and runtime JS files in Assets stay on this site unless you check the option above.";

/** Composer empty state when an editor has no slot lists to open on this page. */
export const CMS_SLOTS_EDITOR_NO_SLOTS_TITLE = "No Slots Found";

export const CMS_SLOTS_EDITOR_NO_SLOTS_DESCRIPTION = "Contact your team admin or site designer to enable this feature";

export const CMS_SLOTS_EDITOR_NO_SLOTS_BACK_LABEL = "Back";

/** Action label on the home tile and route gate when CMS Slots is not on a collection template. */
export const CMS_SLOTS_COLLECTION_TEMPLATE_PROMPT_LABEL = "Open a CMS collection template";

export const CMS_SLOTS_COLLECTION_TEMPLATE_PROMPT_NOTIFY_MESSAGE =
  "In the Designer, open Pages and select a CMS collection template.";

/** Screen-reader label for the collection-template prompt control. */
export const CMS_SLOTS_REQUIRES_COLLECTION_TEMPLATE_ARIA_LABEL = `${CMS_SLOTS_FEATURE_NAME}: ${CMS_SLOTS_COLLECTION_TEMPLATE_PROMPT_LABEL}`;

export const CMS_SLOTS_DESIGNER_MAIN_TITLE = "Designer";

export const CMS_SLOTS_DESIGNER_MAIN_DESCRIPTION = "Set up slots, components, and fields for this collection.";

export const CMS_SLOTS_COMPOSER_MAIN_TITLE = "Compose";

export const CMS_SLOTS_COMPOSER_MAIN_DESCRIPTION = "Manage CMS Slot content for collection entries.";

export const CMS_SLOTS_COMPOSER_EDITING_CONTEXT_SECTION_LABEL = "Collection Entry";

export const CMS_SLOTS_COMPOSER_EDITING_CONTEXT_COLLECTION_LABEL = "Collection";

export const CMS_SLOTS_COMPOSER_EDITING_CONTEXT_SLOT_LIST_LABEL = "Slot list";

export const CMS_SLOTS_COMPOSER_EDITING_CONTEXT_LOADING = "Loading CMS context…";

export const CMS_SLOTS_COMPOSER_EDITING_CONTEXT_NO_ENTRY =
  "Select a collection item in the Designer to edit its slot content.";

export const CMS_SLOTS_COMPOSER_EDITING_CONTEXT_NO_TOWER = "Connect Webflow in Tower to load collection entries.";

export const CMS_SLOTS_COMPOSER_EDITING_CONTEXT_STATIC_PAGE =
  "Open a CMS collection template to compose entry-specific slot content.";

export const CMS_SLOTS_COMPOSER_EDITING_CONTEXT_UNAVAILABLE = "Could not load this collection from Webflow.";

export const CMS_SLOTS_DESIGNER_EDITING_TITLE = "Configure Slot Settings";

export const CMS_SLOTS_DESIGNER_EDITING_DESCRIPTION = "Add components and expose props for this slot list.";

export const CMS_SLOTS_DESIGNER_SLOT_COMPONENT_LABEL = "Slot component";

export const CMS_SLOTS_DESIGNER_LIST_TARGET_ON_CANVAS_TITLE = "On canvas";

export const CMS_SLOTS_DESIGNER_COMPONENTS_LABEL = "Components";

export const CMS_SLOTS_DESIGNER_COMPONENTS_EMPTY_TITLE = "No components yet";

export const CMS_SLOTS_DESIGNER_COMPONENTS_EMPTY_DESCRIPTION = "Click the Add button to add components to this slot.";

export const CMS_SLOTS_DESIGNER_ADD_COMPONENT_LABEL = "Add component";

export const CMS_SLOTS_DESIGNER_COMPONENT_LIBRARY_TITLE = "Component library";

export const CMS_SLOTS_DESIGNER_COMPONENT_LIBRARY_DESCRIPTION = "Search site components to add to this list.";

export const CMS_SLOTS_DESIGNER_COMPONENT_LIBRARY_SEARCH_PLACEHOLDER = "Search components";

export const CMS_SLOTS_DESIGNER_COMPONENT_LIBRARY_LOADING_ARIA_LABEL = "Loading components";

export const CMS_SLOTS_DESIGNER_COMPONENT_LIBRARY_LIST_ARIA_LABEL = "Components";

export const CMS_SLOTS_DESIGNER_SELECTED_COMPONENTS_ARIA_LABEL = "Selected components";

export const CMS_SLOTS_DESIGNER_SLOT_COMPONENT_PLACE_TITLE = "Not on canvas";

export const CMS_SLOTS_DESIGNER_SLOT_COMPONENT_PLACE_GUIDE = "Place the slot on the page to continue setup.";

export const CMS_SLOTS_DESIGNER_SLOT_COMPONENT_ON_CANVAS_GUIDE = "Select and use navigator to position it on the page.";

export const CMS_SLOTS_DESIGNER_SELECT_ON_CANVAS_LABEL = "Select";

export const CMS_SLOTS_DESIGNER_SELECT_ON_CANVAS_SELECTED_LABEL = "Selected";

export const CMS_SLOTS_DESIGNER_SELECT_ON_CANVAS_PENDING_LABEL = "Selecting…";

export const CMS_SLOTS_DESIGNER_LIST_TARGET_ABSENT_TITLE = "Not set up";

export const CMS_SLOTS_DESIGNER_LIST_TARGET_ABSENT_DESCRIPTION =
  "This list needs a slot component before it can render on the page.";

export const CMS_SLOTS_DESIGNER_LIST_TARGET_CHECKING_TITLE = "Checking status";

export const CMS_SLOTS_DESIGNER_LIST_TARGET_CHECKING_DESCRIPTION =
  "Verifying whether the slot component is on this page.";

export const CMS_SLOTS_DESIGNER_LIST_TARGET_UPDATING_TITLE = "Updating";

export const CMS_SLOTS_DESIGNER_LIST_TARGET_UPDATING_DESCRIPTION = "Syncing slot component changes on this page.";

export const CMS_SLOTS_DESIGNER_PLACE_ON_CANVAS_LABEL = "Place on canvas";

export const CMS_SLOTS_DESIGNER_PLACE_ON_CANVAS_PENDING_LABEL = "Placing…";

export const CMS_SLOTS_DESIGNER_CREATE_TARGET_LABEL = "Create";

export const CMS_SLOTS_DESIGNER_CREATE_TARGET_PENDING_LABEL = "Creating…";

export const CMS_SLOTS_DESIGNER_LIST_TARGET_CHECKING_LABEL = "Checking…";

export const CMS_SLOTS_DESIGNER_LIST_TARGET_UPDATING_LABEL = "Updating…";

export const CMS_SLOTS_DESIGNER_REMOVE_TARGET_LABEL = "Remove target…";

export const CMS_SLOTS_DESIGNER_BACK_TO_LIST_LABEL = "Back to list";

export const CMS_SLOTS_COMPOSER_ORDER_EMPTY_TITLE = "No components yet";

export const CMS_SLOTS_COMPOSER_ORDER_EMPTY_DESCRIPTION = "Use Add Component to choose types for this composition.";

export const CMS_SLOTS_COMPOSER_ADD_COMPONENT_LABEL = "Add Component";

export const CMS_SLOTS_COMPOSER_PALETTE_SHEET_TITLE = "Add components";

export const CMS_SLOTS_COMPOSER_PALETTE_SHEET_DESCRIPTION = "Component types exposed in Designer for this list.";

export const CMS_SLOTS_COMPOSER_PALETTE_LIST_ARIA_LABEL = "Allowed component types for this list";

export const CMS_SLOTS_COMPOSER_PALETTE_EMPTY_TITLE = "No component types available";

export const CMS_SLOTS_COMPOSER_PALETTE_EMPTY_DESCRIPTION =
  "Configure and expose components in Designer before adding them here.";

export const CMS_SLOTS_COMPOSER_REMOVE_COMPONENT_DIALOG_TITLE = "Remove this component?";

export const CMS_SLOTS_COMPOSER_REMOVE_COMPONENT_DIALOG_DESCRIPTION =
  "This removes the component and its content from the composition.";

export const CMS_SLOTS_COMPOSER_REMOVE_COMPONENT_DIALOG_CANCEL = "Keep component";

export const CMS_SLOTS_COMPOSER_REMOVE_COMPONENT_DIALOG_CONFIRM = "Remove from composition";

export const CMS_SLOTS_COMPOSER_LEAVE_UNSAVED_DIALOG_TITLE = "Save changes?";

export const CMS_SLOTS_COMPOSER_LEAVE_UNSAVED_DIALOG_DESCRIPTION =
  "Save your changes before leaving, or discard them to keep the previous composition.";

export const CMS_SLOTS_COMPOSER_LEAVE_UNSAVED_DIALOG_CONTINUE = "Continue editing";

export const CMS_SLOTS_COMPOSER_LEAVE_UNSAVED_DIALOG_DISCARD = "Discard changes";

export const CMS_SLOTS_COMPOSER_LEAVE_UNSAVED_DIALOG_SAVE = "Save changes";

export const CMS_SLOTS_COMPOSER_SLOT_EDIT_DONE = "Done";

export const CMS_SLOTS_COMPOSER_SLOT_NAME_FIELD_LABEL = "Name";

export const CMS_SLOTS_COMPOSER_SLOT_NAME_FIELD_TOOLTIP =
  "Helps you identify this item in Composer. Doesn't affect site content.";

export const CMS_SLOTS_COMPOSER_IMAGE_PROP_HINT = "Copy image link from Webflow Assets.";

export const CMS_SLOTS_COMPOSER_IMAGE_UPLOAD_LABEL = "Upload image";
export const CMS_SLOTS_COMPOSER_IMAGE_REPLACE_LABEL = "Replace";
export const CMS_SLOTS_COMPOSER_IMAGE_REMOVE_LABEL = "Remove";
export const CMS_SLOTS_COMPOSER_IMAGE_REMOVE_DIALOG_TITLE = "Remove this image?";
export const CMS_SLOTS_COMPOSER_IMAGE_REMOVE_DIALOG_DESCRIPTION =
  "This clears the image from this field. You can upload a new one anytime.";
export const CMS_SLOTS_COMPOSER_IMAGE_REMOVE_DIALOG_CANCEL = "Keep image";
export const CMS_SLOTS_COMPOSER_IMAGE_REMOVE_DIALOG_CONFIRM = "Remove image";
export const CMS_SLOTS_COMPOSER_IMAGE_BLOCKED_HINT = "Image size not set by Designer.";
export const CMS_SLOTS_COMPOSER_IMAGE_DRAWER_TITLE = "Upload image";
export const CMS_SLOTS_COMPOSER_IMAGE_DRAWER_DESCRIPTION =
  "Upload and crop to the size the Designer set for this field.";

export const CMS_SLOTS_DESIGNER_EXPOSE_PROPS_DESCRIPTION = "Choose which props to include for this slot.";

export const CMS_SLOTS_DESIGNER_EXPOSE_PROPS_LOADING = "Loading…";

export const CMS_SLOTS_DESIGNER_EXPOSE_PROPS_EMPTY = "No composable props found for this component.";

export const CMS_SLOTS_DESIGNER_EXPOSE_PROPS_LIST_ARIA_LABEL = "Composer props";

export const CMS_SLOTS_DESIGNER_EXPOSE_PROPS_OPEN_LABEL = "Open";

/** First-time label: this slot has no editable fields yet. */
export const CMS_SLOTS_DESIGNER_EXPOSE_PROPS_TAG_LABEL = "Make editable";

/** Update label: this slot already has editable fields and the selection changed. */
export const CMS_SLOTS_DESIGNER_EXPOSE_PROPS_APPLY_LABEL = "Apply changes";

export const CMS_SLOTS_DESIGNER_EXPOSE_PROPS_TAG_PENDING_LABEL = "Applying…";

export const CMS_SLOTS_DESIGNER_EXPOSE_PROPS_DISCARD_DIALOG_TITLE = "Make editable first?";

export const CMS_SLOTS_DESIGNER_EXPOSE_PROPS_APPLY_DISCARD_DIALOG_TITLE = "Apply changes first?";

export const CMS_SLOTS_DESIGNER_EXPOSE_PROPS_DISCARD_DIALOG_DESCRIPTION =
  "Apply your changes so editors can fill these fields in Composer, or discard to restore the fields you started with.";

/** Apply outcome — something changed on the canvas. */
export const CMS_SLOTS_DESIGNER_RESYNC_UPDATED = "Editable fields updated. Publish your site to update the live page.";

/** Apply outcome — fields are wired but already matched the canvas (idempotent re-apply); not an error. */
export const CMS_SLOTS_DESIGNER_RESYNC_UP_TO_DATE = "Already up to date — these fields are editable in Composer.";

/** Apply outcome — fields are selected but no element in the component is connected to them yet. */
export const CMS_SLOTS_DESIGNER_RESYNC_NOTHING_BOUND =
  "No elements are connected to these fields yet. Inside the component, connect an element to each prop (or wire a nested instance to it), then Apply changes.";

/** Apply outcome — no editable fields are selected and nothing needed changing. */
export const CMS_SLOTS_DESIGNER_RESYNC_NO_FIELDS = "No editable fields selected for this slot.";

export const CMS_SLOTS_DESIGNER_EXPOSE_PROPS_DISCARD_DIALOG_CONTINUE_LABEL = "Continue editing";

export const CMS_SLOTS_DESIGNER_EXPOSE_PROPS_DISCARD_DIALOG_DISCARD_LABEL = "Discard changes";
