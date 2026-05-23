import {
  IMAGE_TARGET_STEP_COMPONENT_FIELD,
  IMAGE_TARGET_STEP_IMAGE_ELEMENT,
} from "@/features/image-editor/lib/image-editor-target-step-copy";
import type { ImagePageTarget } from "@/features/image-editor/lib/scan-image-targets-on-page";

export function formatImagePageTargetPrimaryLabel(target: ImagePageTarget): string {
  return target.kind === "component" && target.imagePropLabel != null
    ? `${target.label} — ${target.imagePropLabel}`
    : target.label;
}

export function formatImagePageTargetKindLabel(target: ImagePageTarget): string {
  return target.kind === "image" ? IMAGE_TARGET_STEP_IMAGE_ELEMENT : IMAGE_TARGET_STEP_COMPONENT_FIELD;
}
