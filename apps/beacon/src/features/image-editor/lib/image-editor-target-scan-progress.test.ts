import { describe, expect, it } from "vitest";

import {
  formatImagePageTargetScanCollectionDetail,
  formatImagePageTargetScanProgress,
} from "@/features/image-editor/lib/image-editor-target-scan-progress";
import {
  IMAGE_TARGET_STEP_SCAN_COLLECTING,
  IMAGE_TARGET_STEP_SCAN_PENDING,
} from "@/features/image-editor/lib/image-editor-target-step-copy";

describe("formatImagePageTargetScanProgress", () => {
  it("returns indeterminate progress while collecting page elements", () => {
    expect(
      formatImagePageTargetScanProgress({
        phase: "collecting",
        scannedElements: 0,
        totalElements: 0,
        foundTargets: 0,
      })
    ).toEqual({
      value: null,
      indeterminate: true,
      label: IMAGE_TARGET_STEP_SCAN_PENDING,
      detail: IMAGE_TARGET_STEP_SCAN_COLLECTING,
    });
  });

  it("returns mapped counts with indeterminate progress while collecting", () => {
    expect(
      formatImagePageTargetScanProgress({
        phase: "collecting",
        scannedElements: 482,
        totalElements: 0,
        foundTargets: 0,
      })
    ).toEqual({
      value: null,
      indeterminate: true,
      label: IMAGE_TARGET_STEP_SCAN_PENDING,
      detail: formatImagePageTargetScanCollectionDetail(482),
    });
  });

  it("returns element counts and percentage while scanning", () => {
    expect(
      formatImagePageTargetScanProgress({
        phase: "scanning",
        scannedElements: 25,
        totalElements: 100,
        foundTargets: 3,
      })
    ).toEqual({
      value: 25,
      indeterminate: false,
      label: IMAGE_TARGET_STEP_SCAN_PENDING,
      detail: "25 of 100 elements · 3 found",
    });
  });

  it("caps progress at 100 percent", () => {
    expect(
      formatImagePageTargetScanProgress({
        phase: "scanning",
        scannedElements: 120,
        totalElements: 100,
        foundTargets: 1,
      }).value
    ).toBe(100);
  });
});

describe("formatImagePageTargetScanCollectionDetail", () => {
  it("formats discovered counts with grouping separators", () => {
    expect(formatImagePageTargetScanCollectionDetail(4820)).toBe("4,820 elements mapped…");
  });
});
