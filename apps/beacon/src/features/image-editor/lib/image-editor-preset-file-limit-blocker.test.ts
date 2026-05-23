import { BEACON_IMAGE_ERROR_CODES } from "@codalyn/webflow-kit";
import { describe, expect, it } from "vitest";

import { resolveImageEditorPresetFileLimitBlocker } from "./image-editor-preset-file-limit-blocker";

describe("resolveImageEditorPresetFileLimitBlocker", () => {
  it("returns null when enforcement is disabled", () => {
    const result = resolveImageEditorPresetFileLimitBlocker({
      enforceEnabled: false,
      maxFileSizeBytes: 100_000,
      estimatedBytes: 120_000,
    });
    expect(result).toBeNull();
  });

  it("returns null when cap is missing", () => {
    const result = resolveImageEditorPresetFileLimitBlocker({
      enforceEnabled: true,
      maxFileSizeBytes: null,
      estimatedBytes: 120_000,
    });
    expect(result).toBeNull();
  });

  it("returns null when estimate is missing", () => {
    const result = resolveImageEditorPresetFileLimitBlocker({
      enforceEnabled: true,
      maxFileSizeBytes: 100_000,
      estimatedBytes: null,
    });
    expect(result).toBeNull();
  });

  it("returns null when estimate is at cap", () => {
    const result = resolveImageEditorPresetFileLimitBlocker({
      enforceEnabled: true,
      maxFileSizeBytes: 100_000,
      estimatedBytes: 100_000,
    });
    expect(result).toBeNull();
  });

  it("returns null when estimate is under cap", () => {
    const result = resolveImageEditorPresetFileLimitBlocker({
      enforceEnabled: true,
      maxFileSizeBytes: 100_000,
      estimatedBytes: 99_999,
    });
    expect(result).toBeNull();
  });

  it("returns deterministic blocker when estimate exceeds cap", () => {
    const result = resolveImageEditorPresetFileLimitBlocker({
      enforceEnabled: true,
      maxFileSizeBytes: 100_000,
      estimatedBytes: 120_000,
    });
    expect(result).toEqual({
      code: BEACON_IMAGE_ERROR_CODES.EXPORT_PRESET_FILE_LIMIT_EXCEEDED,
      estimatedBytes: 120_000,
      maxFileSizeBytes: 100_000,
    });
  });
});
