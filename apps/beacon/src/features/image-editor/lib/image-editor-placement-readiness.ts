import { type PlacementMode, WEBFLOW_IMAGE_ELEMENT_TYPE } from "@/features/image-editor/lib/apply-cropped-export";
import type { ElementCmsBindingResolution } from "@/features/image-editor/lib/cms-primary-upload-context";

/**
 * Element `type` strings whose Designer typings use `NoChildren` (cannot `append` a nested Image).
 * Derived from `@webflow/designer-extension-typings` `elements-generated.d.ts` (NoChildren ∪ type).
 * When there is no CMS/component image field, Selection mode would only rely on sibling `after()` for
 * these — we hide Selection instead so “Page” is the obvious path.
 */
const WEBFLOW_NO_CHILD_ELEMENT_TYPES = new Set<string>([
  "",
  "Animation",
  "CodeBlock",
  "Comment",
  "CommerceAddToCartButton",
  "CommerceAddToCartErrorMsg",
  "CommerceAddToCartOptionSelect",
  "CommerceAddToCartQuantityInput",
  "CommerceBuyNowButton",
  "CommerceCartApplePayIcon",
  "CommerceCartCheckoutButton",
  "CommerceCartCloseLinkIcon",
  "CommerceCartErrorMsg",
  "CommerceCartItemImage",
  "CommerceCartOpenLinkCount",
  "CommerceCartOpenLinkIcon",
  "CommerceCartQuantity",
  "CommerceCheckoutAdditionalCheckbox",
  "CommerceCheckoutAdditionalTextArea",
  "CommerceCheckoutAdditionalTextInput",
  "CommerceCheckoutBillingAddressToggleCheckbox",
  "CommerceCheckoutBillingCity",
  "CommerceCheckoutBillingCountrySelector",
  "CommerceCheckoutBillingFullName",
  "CommerceCheckoutBillingStateProvince",
  "CommerceCheckoutBillingStreetAddress",
  "CommerceCheckoutBillingStreetAddressOptional",
  "CommerceCheckoutBillingZipPostalCode",
  "CommerceCheckoutCardExpirationDate",
  "CommerceCheckoutCardNumber",
  "CommerceCheckoutCardSecurityCode",
  "CommerceCheckoutDiscountsButton",
  "CommerceCheckoutDiscountsInput",
  "CommerceCheckoutEmailInput",
  "CommerceCheckoutErrorMsg",
  "CommerceCheckoutOrderItemOptionListItemLabel",
  "CommerceCheckoutOrderItemOptionListItemValue",
  "CommerceCheckoutPlaceOrderButton",
  "CommerceCheckoutShippingCity",
  "CommerceCheckoutShippingCountrySelector",
  "CommerceCheckoutShippingFullName",
  "CommerceCheckoutShippingMethodNameBlock",
  "CommerceCheckoutShippingMethodRadioButton",
  "CommerceCheckoutShippingStateProvince",
  "CommerceCheckoutShippingStreetAddress",
  "CommerceCheckoutShippingStreetAddressOptional",
  "CommerceCheckoutShippingZipPostalCode",
  "CommercePayPalCheckoutButton",
  "CommercePaypalCheckoutErrorMessage",
  "CommerceQuickCheckoutGoogleIcon",
  "CommerceQuickCheckoutMicrosoftIcon",
  "ComponentInstance",
  "CustomCode",
  "Facebook",
  "FacebookPixel",
  "FormButton",
  "FormCheckboxInput",
  "FormFileUploadErrorMsg",
  "FormFileUploadFileName",
  "FormFileUploadInput",
  "FormFileUploadUploadingIcon",
  "FormRadioInput",
  "FormReCaptcha",
  "FormSelect",
  "FormTextInput",
  "FormTextarea",
  "GoogleAnalytics",
  "GooglePlus",
  "Hreflangs",
  "HtmlEmbed",
  "Iframe",
  "Image",
  "MapWidget",
  "Meta",
  "PaginationCount",
  "PaginationNextIcon",
  "PaginationPreviousIcon",
  "Rive",
  "SearchButton",
  "SearchInput",
  "Spline",
  "String",
  "Title",
  "Twitter",
  "Video",
  "YouTubeVideo",
]);

export type ImageEditorPlacementBlocker =
  | "missing-crop"
  | "replace-wrong-type"
  | "selection-empty"
  | "selection-props-loading"
  | "selection-pick-field";

export type ImageEditorPlacementReadiness = { ok: true } | { ok: false; blocker: ImageEditorPlacementBlocker };

export type ImageEditorPlacementContext = {
  placement: PlacementMode;
  hasCompletedCrop: boolean;
  selectedElementType: string | null;
  componentImagePropsResolving: boolean;
  componentImagePropCount: number;
  selectedComponentImagePropId: string | null;
};

/**
 * Preconditions for the editor primary action (before encode/upload).
 * Stricter than `applyCroppedImageToWebflow` for selection mode (requires a canvas selection).
 */
export function getImageEditorPlacementReadiness(ctx: ImageEditorPlacementContext): ImageEditorPlacementReadiness {
  if (!ctx.hasCompletedCrop) {
    return { ok: false, blocker: "missing-crop" };
  }
  if (ctx.placement === "library" || ctx.placement === "canvas" || ctx.placement === "download") {
    return { ok: true };
  }
  if (ctx.placement === "replace") {
    if (ctx.selectedElementType !== WEBFLOW_IMAGE_ELEMENT_TYPE) {
      return { ok: false, blocker: "replace-wrong-type" };
    }
    return { ok: true };
  }
  if (!ctx.selectedElementType) {
    return { ok: false, blocker: "selection-empty" };
  }
  if (ctx.componentImagePropsResolving) {
    return { ok: false, blocker: "selection-props-loading" };
  }
  if (ctx.componentImagePropCount > 1 && !ctx.selectedComponentImagePropId) {
    return { ok: false, blocker: "selection-pick-field" };
  }
  return { ok: true };
}

export type SelectionPlacementOfferContext = {
  selectedElementType: string | null;
  componentImagePropsResolving: boolean;
  componentImagePropCount: number;
  elementCmsBinding: ElementCmsBindingResolution;
  elementCmsBindingLoading: boolean;
};

/** Whether the Placement UI should list “Selection” for the current canvas selection. */
export function shouldOfferSelectionPlacement(ctx: SelectionPlacementOfferContext): boolean {
  const {
    selectedElementType,
    componentImagePropsResolving,
    componentImagePropCount,
    elementCmsBinding,
    elementCmsBindingLoading,
  } = ctx;

  if (selectedElementType == null) {
    return false;
  }

  if (selectedElementType === "ComponentInstance") {
    if (componentImagePropsResolving) {
      return true;
    }
    return componentImagePropCount > 0;
  }

  if (elementCmsBindingLoading) {
    return true;
  }

  if (elementCmsBinding === "single" || elementCmsBinding === "multiple") {
    return true;
  }

  if (selectedElementType === WEBFLOW_IMAGE_ELEMENT_TYPE) {
    return true;
  }

  return !WEBFLOW_NO_CHILD_ELEMENT_TYPES.has(selectedElementType);
}

/** “Replace” only applies when an Image element is selected. */
export function shouldOfferReplacePlacement(selectedElementType: string | null): boolean {
  return selectedElementType === WEBFLOW_IMAGE_ELEMENT_TYPE;
}

/** Maps stale placement state when the current mode’s radio row is hidden. */
export function resolvePlacementWhenOptionHidden(
  placement: PlacementMode,
  offerSelectionPlacement: boolean,
  offerReplacePlacement: boolean
): PlacementMode {
  if (placement === "selection" && !offerSelectionPlacement) {
    return "canvas";
  }
  if (placement === "replace" && !offerReplacePlacement) {
    return "library";
  }
  return placement;
}
