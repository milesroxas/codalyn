import { BEACON_IMAGE_ERROR_CODES } from "@codalyn/webflow-kit";

export type ImageEditorPresetFileLimitBlocker = {
  code: typeof BEACON_IMAGE_ERROR_CODES.EXPORT_PRESET_FILE_LIMIT_EXCEEDED;
  estimatedBytes: number;
  maxFileSizeBytes: number;
};

export function resolveImageEditorPresetFileLimitBlocker(input: {
  enforceEnabled: boolean;
  maxFileSizeBytes: number | null;
  estimatedBytes: number | null;
}): ImageEditorPresetFileLimitBlocker | null {
  const { enforceEnabled, maxFileSizeBytes, estimatedBytes } = input;
  if (!enforceEnabled || maxFileSizeBytes == null || estimatedBytes == null) {
    return null;
  }
  if (estimatedBytes <= maxFileSizeBytes) {
    return null;
  }
  return {
    code: BEACON_IMAGE_ERROR_CODES.EXPORT_PRESET_FILE_LIMIT_EXCEEDED,
    estimatedBytes,
    maxFileSizeBytes,
  };
}
