import type { ExportConstraints } from "@codalyn/webflow-kit";
import { describe, expect, it } from "vitest";

import {
  type ComposableInstancePropMeta,
  hasUnconstrainedExposedImageProps,
  isExposedImagePropConstrained,
} from "./cms-slot-composable-props";

const VALID: ExportConstraints = {
  width: 1200,
  height: 800,
  exportFormat: "webp",
  maxFileSizeBytes: 500_000,
  quality: 0.8,
};

function imageProp(imageExport?: ExportConstraints): ComposableInstancePropMeta {
  return { propId: "p-img", label: "Hero", valueType: "image", imageExport };
}

describe("isExposedImagePropConstrained", () => {
  it("true only with valid constraints", () => {
    expect(isExposedImagePropConstrained(imageProp(VALID))).toBe(true);
    expect(isExposedImagePropConstrained(imageProp(undefined))).toBe(false);
    expect(isExposedImagePropConstrained(imageProp({ ...VALID, width: 0 }))).toBe(false);
  });
});

describe("hasUnconstrainedExposedImageProps", () => {
  it("flags upload-image props without valid constraints", () => {
    expect(hasUnconstrainedExposedImageProps([imageProp(undefined)])).toBe(true);
    expect(hasUnconstrainedExposedImageProps([imageProp(VALID)])).toBe(false);
  });

  it("ignores non-upload value types (e.g. file, text)", () => {
    const file: ComposableInstancePropMeta = { propId: "p-file", label: "Doc", valueType: "file" };
    const text: ComposableInstancePropMeta = { propId: "p-txt", label: "Title", valueType: "string" };
    expect(hasUnconstrainedExposedImageProps([file, text])).toBe(false);
  });

  it("flags when any one exposed image prop is unconstrained", () => {
    expect(hasUnconstrainedExposedImageProps([imageProp(VALID), imageProp(undefined)])).toBe(true);
  });
});
