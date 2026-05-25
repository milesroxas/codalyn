import { type ImageExportFormat, mimeTypeForFormat } from "@codalyn/webflow-kit";
import type { Area } from "react-easy-crop";
import {
  asCmsBinding,
  type CmsImageBindingRef,
  resolveSingleElementCmsImageBinding,
} from "@/features/image-editor/lib/element-cms-image-binding";
import { towerFetch } from "@/shared/lib/tower-client";
import { isTowerUsageLimitError, type TowerUsageLimitDetails } from "@/shared/lib/tower-usage-limit-error";
import { renderCroppedRegionToCanvas } from "./crop-image";
import { encodeCanvasToOptimizedFile } from "./encode-image-blob";
import { placeImageOnCanvasAtBody, placeImageOnCanvasWithAsset } from "./insert-on-canvas";
import { searchComponentInstanceImageProps } from "./search-component-instance-image-props";

export const MAX_EDGE = 8192;
export const MIN_EDGE = 1;

export function clampEdge(n: number): number {
  if (Number.isNaN(n)) {
    return MIN_EDGE;
  }
  return Math.min(MAX_EDGE, Math.max(MIN_EDGE, Math.round(n)));
}

/** Strips non-digit characters from dimension text inputs. */
export function sanitizeDimensionDigitsInput(value: string): string {
  return value.replace(/\D/g, "");
}

/** Resolves width/height from the export inputs; empty or invalid uses fallback. */
export function parseOutputDimension(input: string, fallback: number): number {
  const n = Number(input);
  if (input.trim() === "" || Number.isNaN(n)) {
    return clampEdge(fallback);
  }
  return clampEdge(n);
}

/** Like `parseOutputDimension` but no fallback — used when export size must be entered explicitly. */
export function parseOutputDimensionStrict(input: string): number | null {
  const t = input.trim();
  if (t === "") {
    return null;
  }
  const n = Number(t);
  if (Number.isNaN(n)) {
    return null;
  }
  return clampEdge(n);
}

/**
 * Pixel dimensions for export so the output matches the crop aspect ratio (no stretch).
 * Uses the larger of the resolved width/height as the long edge, then derives the other side.
 */
export function outputDimensionsMatchingCrop(
  completedCrop: Area,
  widthInput: number,
  heightInput: number
): { width: number; height: number } {
  const ar = completedCrop.width / completedCrop.height;
  if (ar <= 0 || !Number.isFinite(ar)) {
    return { width: clampEdge(widthInput), height: clampEdge(heightInput) };
  }
  const w = clampEdge(widthInput);
  const h = clampEdge(heightInput);
  const maxEdge = Math.max(w, h);
  if (ar >= 1) {
    const outW = clampEdge(maxEdge);
    const outH = clampEdge(Math.round(outW / ar));
    return { width: outW, height: outH };
  }
  const outH = clampEdge(maxEdge);
  const outW = clampEdge(Math.round(outH * ar));
  return { width: outW, height: outH };
}

export type ExportResult =
  | { kind: "success"; message: string; cmsFieldUpdated?: boolean }
  | { kind: "info"; message: string }
  | { kind: "error"; message: string }
  | { kind: "usage-limit"; details: TowerUsageLimitDetails };

function toExportErrorResult(err: unknown): ExportResult {
  if (isTowerUsageLimitError(err)) {
    return { kind: "usage-limit", details: err.details };
  }
  const message = err instanceof Error ? err.message : "Could not process the image.";
  return { kind: "error", message };
}

export type ImageExportSuccessContext = {
  message: string;
  cmsFieldUpdated: boolean;
};

/** Where the export goes: Assets only, canvas placement, replace selected Image, or local WebP download. */
export type PlacementMode = "library" | "canvas" | "selection" | "replace" | "download";

/** Webflow Designer API `element.type` for Image elements. */
export const WEBFLOW_IMAGE_ELEMENT_TYPE = "Image" as const;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function webflowValidationDetailLine(d: unknown): string {
  if (!isRecord(d)) {
    return "";
  }
  let p = "";
  if (typeof d.param === "string") {
    p = d.param;
  } else if (typeof d.field === "string") {
    p = d.field;
  }
  let description = "";
  if (typeof d.description === "string") {
    description = d.description;
  } else if (typeof d.message === "string") {
    description = d.message;
  }
  return [p, description].filter((s) => s.trim().length > 0).join(": ");
}

function towerErrorMessageFromJson(parsed: Record<string, unknown>): string | null {
  const msg = typeof parsed.message === "string" ? parsed.message.trim() : "";
  const details = parsed.details;
  if (Array.isArray(details) && details.length > 0) {
    const joined = details.map(webflowValidationDetailLine).filter(Boolean).join("; ");
    if (joined) {
      return (msg ? `${msg} — ${joined}` : joined).slice(0, 500);
    }
  }
  if (typeof parsed.error === "string" && parsed.error.trim()) {
    return parsed.error;
  }
  if (msg) {
    return msg;
  }
  if (typeof parsed.hint === "string" && parsed.hint.trim()) {
    return parsed.hint;
  }
  return null;
}

async function readTowerErrorDetail(res: Response): Promise<string> {
  const raw = (await res.text()).trim();
  if (!raw) {
    return res.statusText || `HTTP ${res.status}`;
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out = towerErrorMessageFromJson(parsed);
    if (out) {
      return out;
    }
  } catch {
    // use raw
  }
  return raw.slice(0, 500);
}

async function resolveCollectionFieldSlug(collectionId: string, fieldId: string): Promise<string> {
  const collectionRes = await towerFetch(`/api/v2/webflow/collections/${encodeURIComponent(collectionId)}`);
  if (!collectionRes.ok) {
    const detail = await readTowerErrorDetail(collectionRes);
    throw new Error(`Could not read CMS collection fields (${collectionRes.status}): ${detail}`);
  }

  let data: unknown;
  try {
    data = await collectionRes.json();
  } catch {
    throw new Error("Could not parse CMS collection details.");
  }

  const fields = isRecord(data) && Array.isArray(data.fields) ? data.fields : null;
  if (!fields) {
    throw new Error("CMS collection response was missing fields.");
  }

  for (const field of fields) {
    if (!isRecord(field)) {
      continue;
    }
    if (field.id !== fieldId) {
      continue;
    }
    if (typeof field.slug === "string" && field.slug.trim()) {
      return field.slug;
    }
    break;
  }

  throw new Error("Could not resolve the CMS image field.");
}

/**
 * PATCH live collection item — publishes field updates to the live CMS item (not staged-only draft).
 * Image field in `fieldData` (Image type: `fileId` + `url` or `{ url }` per Data API).
 * @see https://developers.webflow.com/data/reference/cms/collection-items/live-items/update-item-live
 * @see https://developers.webflow.com/data/reference/field-types-item-values (Image write)
 */
async function updateCmsImageField(options: {
  binding: CmsImageBindingRef;
  cmsItemId: string;
  imageUrl: string;
  asset: Asset;
}): Promise<void> {
  const { binding, cmsItemId, imageUrl, asset } = options;
  const fieldSlug = await resolveCollectionFieldSlug(binding.collectionId, binding.fieldId);
  const path = `/api/v2/webflow/collections/${encodeURIComponent(binding.collectionId)}/items/${encodeURIComponent(cmsItemId)}/live?skipInvalidFiles=false`;
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  } as const;

  const bodyWithAsset = {
    fieldData: {
      [fieldSlug]: { fileId: asset.id, url: imageUrl },
    },
  };
  const bodyUrlOnly = {
    fieldData: {
      [fieldSlug]: { url: imageUrl },
    },
  };

  let patchRes = await towerFetch(path, {
    method: "PATCH",
    headers,
    body: JSON.stringify(bodyWithAsset),
  });

  if (!patchRes.ok) {
    patchRes = await towerFetch(path, {
      method: "PATCH",
      headers,
      body: JSON.stringify(bodyUrlOnly),
    });
  }

  if (!patchRes.ok) {
    const detail = await readTowerErrorDetail(patchRes);
    throw new Error(`Could not update CMS item image field (${patchRes.status}): ${detail}`);
  }
}

async function applyCmsBindingWithAsset(options: {
  binding: CmsImageBindingRef;
  label: string;
  cmsItemId: string | null | undefined;
  asset: Asset;
  /** When the selection is a canvas Image, syncs the element to the new site asset so the Designer shows it without a reload. */
  syncCanvasImage?: ImageElement | null;
}): Promise<ExportResult> {
  const { binding, label, cmsItemId, asset, syncCanvasImage } = options;
  if (!cmsItemId) {
    return {
      kind: "info",
      message: "Switch to a CMS item page, then try again.",
    };
  }

  const imageUrl = await asset.getUrl();
  if (!imageUrl?.trim()) {
    return { kind: "error", message: "Could not resolve the uploaded image URL for CMS." };
  }

  await updateCmsImageField({ binding, cmsItemId, imageUrl: imageUrl.trim(), asset });
  if (syncCanvasImage) {
    try {
      await syncCanvasImage.setAsset(asset);
    } catch {
      /* CMS mode may forbid; field still updated via API */
    }
  }
  return {
    kind: "success",
    message: `Updated CMS field “${binding.fieldName ?? label}”.`,
    cmsFieldUpdated: true,
  };
}

function multipleCmsBindingSelectionResult(): ExportResult {
  return {
    kind: "info",
    message: "Selected element has multiple CMS image bindings. Pick a more specific element.",
  };
}

async function applyAssetFolder(asset: Asset, folder: AssetFolder): Promise<void> {
  await asset.setParent(folder);
}

/** Returns a finished result if an image prop was applied; `null` if the instance has no image props. */
async function tryApplyComponentInstanceImageProp(
  instance: ComponentElement,
  asset: Asset,
  componentImagePropId: string | null | undefined,
  currentCmsItemId: string | null | undefined,
  targetFolder: AssetFolder | null
): Promise<ExportResult | null> {
  const imageProps = await searchComponentInstanceImageProps(instance);
  if (imageProps.length === 0) {
    return null;
  }

  let propId: string | null = null;
  if (imageProps.length === 1) {
    propId = imageProps[0].propId;
  } else {
    const chosen = componentImagePropId ?? null;
    if (!chosen || !imageProps.some((p) => p.propId === chosen)) {
      return {
        kind: "info",
        message: "Choose a component image field, then try again.",
      };
    }
    propId = chosen;
  }

  const match = imageProps.find((p) => p.propId === propId);
  if (!match) {
    return { kind: "error", message: "Could not resolve the component image field." };
  }

  const cmsBinding = asCmsBinding(match.value);
  if (cmsBinding) {
    const result = await applyCmsBindingWithAsset({
      binding: cmsBinding,
      label: match.display.label,
      cmsItemId: currentCmsItemId,
      asset,
    });
    await webflow.setSelectedElement(instance);
    return result;
  }

  if (!targetFolder) {
    return { kind: "error", message: "Create an Assets folder first." };
  }
  await applyAssetFolder(asset, targetFolder);
  await instance.setProps([{ propId, value: asset.id }]);
  return {
    kind: "success",
    message: `Updated “${match.display.label}”.`,
  };
}

async function handleReplaceWithLibraryAsset(options: {
  img: ImageElement;
  file: File;
  targetFolder: AssetFolder;
}): Promise<ExportResult> {
  const { img, file, targetFolder } = options;
  const existing = await img.getAsset();
  if (!existing) {
    const asset = await webflow.createAsset(file);
    await applyAssetFolder(asset, targetFolder);
    await img.setAsset(asset);
    await webflow.setSelectedElement(img);
    return { kind: "success", message: "Image applied." };
  }
  await existing.setFile(file);
  await applyAssetFolder(existing, targetFolder);
  await webflow.setSelectedElement(img);
  return { kind: "success", message: "Asset file updated." };
}

async function handleReplacePlacement(options: {
  selectedElement: AnyElement | null;
  file: File;
  targetFolder: AssetFolder | null;
  replaceLibraryAsset: boolean;
  currentCmsItemId: string | null | undefined;
}): Promise<ExportResult> {
  const { selectedElement, file, targetFolder, replaceLibraryAsset, currentCmsItemId } = options;
  if (selectedElement?.type !== WEBFLOW_IMAGE_ELEMENT_TYPE) {
    return {
      kind: "info",
      message: "Select an Image on the canvas.",
    };
  }

  const img = selectedElement as ImageElement;
  const cmsBinding = await resolveSingleElementCmsImageBinding(img);
  if (cmsBinding === "multiple") {
    return multipleCmsBindingSelectionResult();
  }
  if (cmsBinding) {
    const asset = await webflow.createAsset(file);
    if (!currentCmsItemId) {
      if (!targetFolder) {
        return { kind: "error", message: "Create an Assets folder first." };
      }
      await applyAssetFolder(asset, targetFolder);
    }
    const result = await applyCmsBindingWithAsset({
      binding: cmsBinding.binding,
      label: cmsBinding.label,
      cmsItemId: currentCmsItemId,
      asset,
      syncCanvasImage: img,
    });
    await webflow.setSelectedElement(img);
    return result;
  }

  if (replaceLibraryAsset) {
    if (!targetFolder) {
      return { kind: "error", message: "Create an Assets folder first." };
    }
    return handleReplaceWithLibraryAsset({ img, file, targetFolder });
  }

  if (!targetFolder) {
    return { kind: "error", message: "Create an Assets folder first." };
  }
  const asset = await webflow.createAsset(file);
  await applyAssetFolder(asset, targetFolder);
  await img.setAsset(asset);
  await webflow.setSelectedElement(img);
  return { kind: "success", message: "Image replaced." };
}

async function handleSelectionPlacement(options: {
  selectedElement: AnyElement | null;
  file: File;
  targetFolder: AssetFolder | null;
  componentImagePropId: string | null | undefined;
  currentCmsItemId: string | null | undefined;
}): Promise<ExportResult> {
  const { selectedElement, file, targetFolder, componentImagePropId, currentCmsItemId } = options;
  const asset = await webflow.createAsset(file);

  if (selectedElement?.type === "ComponentInstance") {
    const applied = await tryApplyComponentInstanceImageProp(
      selectedElement as ComponentElement,
      asset,
      componentImagePropId,
      currentCmsItemId,
      targetFolder
    );
    if (applied) {
      return applied;
    }
  }

  if (selectedElement) {
    const cmsBinding = await resolveSingleElementCmsImageBinding(selectedElement);
    if (cmsBinding === "multiple") {
      return multipleCmsBindingSelectionResult();
    }
    if (cmsBinding) {
      const syncCanvasImage =
        selectedElement.type === WEBFLOW_IMAGE_ELEMENT_TYPE ? (selectedElement as ImageElement) : null;
      const result = await applyCmsBindingWithAsset({
        binding: cmsBinding.binding,
        label: cmsBinding.label,
        cmsItemId: currentCmsItemId,
        asset,
        syncCanvasImage,
      });
      await webflow.setSelectedElement(selectedElement);
      return result;
    }
  }

  if (!targetFolder) {
    return { kind: "error", message: "Create an Assets folder first." };
  }
  await applyAssetFolder(asset, targetFolder);
  await placeImageOnCanvasWithAsset(asset, false);
  return { kind: "success", message: "Image placed." };
}

export async function applyCroppedImageToWebflow(options: {
  imageSrc: string;
  completedCrop: Area;
  outputWidth: number;
  outputHeight: number;
  quality: number;
  /** Output codec; AVIF uses Tower `/api/v1/images/optimize`; WebP is encoded in the extension. */
  exportFormat: ImageExportFormat;
  fileBaseName: string;
  /** When the selection has multiple image props, the prop to set (from the panel). */
  componentImagePropId?: string | null;
  /** Current CMS item id from Designer `currentcmsitem` subscription. */
  currentCmsItemId?: string | null;
  /** `null` is allowed for CMS field uploads that skip library folder placement, or when no folders exist in primary-CMS context. */
  targetFolder: AssetFolder | null;
  placement: PlacementMode;
  /** Only for `placement === "replace"`: update the existing Assets file instead of uploading a new asset. */
  replaceLibraryAsset: boolean;
}): Promise<ExportResult> {
  const {
    imageSrc,
    completedCrop,
    outputWidth,
    outputHeight,
    quality,
    exportFormat,
    fileBaseName,
    componentImagePropId,
    currentCmsItemId,
    targetFolder,
    placement,
    replaceLibraryAsset,
  } = options;

  try {
    const canvas = await renderCroppedRegionToCanvas(imageSrc, completedCrop, outputWidth, outputHeight);
    const { blob, fileName } = await encodeCanvasToOptimizedFile(canvas, quality, {
      baseName: fileBaseName,
      format: exportFormat,
    });
    const file = new File([blob], fileName, { type: blob.type || mimeTypeForFormat(exportFormat) });
    const selectedElement = await webflow.getSelectedElement();

    if (placement === "library") {
      if (!targetFolder) {
        return { kind: "error", message: "Create an Assets folder first." };
      }
      const asset = await webflow.createAsset(file);
      await applyAssetFolder(asset, targetFolder);
      return { kind: "success", message: "Saved to Assets." };
    }

    if (placement === "canvas") {
      if (!targetFolder) {
        return { kind: "error", message: "Create an Assets folder first." };
      }
      const asset = await webflow.createAsset(file);
      await applyAssetFolder(asset, targetFolder);
      await placeImageOnCanvasAtBody(asset);
      return { kind: "success", message: "Image added to the page." };
    }

    if (placement === "replace") {
      return handleReplacePlacement({
        selectedElement,
        file,
        targetFolder,
        replaceLibraryAsset,
        currentCmsItemId,
      });
    }

    return handleSelectionPlacement({
      selectedElement,
      file,
      targetFolder,
      componentImagePropId,
      currentCmsItemId,
    });
  } catch (err) {
    return toExportErrorResult(err);
  }
}

/** Guest-friendly export: optimized WebP file download (no Assets upload or canvas changes). */
export async function downloadCroppedImageWebp(options: {
  imageSrc: string;
  completedCrop: Area;
  outputWidth: number;
  outputHeight: number;
  quality: number;
  fileBaseName: string;
}): Promise<ExportResult> {
  const { imageSrc, completedCrop, outputWidth, outputHeight, quality, fileBaseName } = options;
  try {
    const canvas = await renderCroppedRegionToCanvas(imageSrc, completedCrop, outputWidth, outputHeight);
    const { blob, fileName } = await encodeCanvasToOptimizedFile(canvas, quality, {
      baseName: fileBaseName,
      format: "webp",
    });
    const url = URL.createObjectURL(blob);
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      URL.revokeObjectURL(url);
    }
    return { kind: "success", message: "Image downloaded." };
  } catch (err) {
    return toExportErrorResult(err);
  }
}
