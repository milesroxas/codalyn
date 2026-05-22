import { BEACON_IMAGE_ERROR_CODES, type BeaconImageErrorCode } from "@codalyn/webflow-kit";

const DEFAULT_MAX_SOURCE_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const DEFAULT_MAX_DECODED_AREA_PIXELS = 40_000_000;

const ALLOWED_SOURCE_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

type SourceImageValidationSuccess = {
  ok: true;
  file: File;
  mimeType: string;
  width: number;
  height: number;
  megapixels: number;
  isAnimatedGif?: boolean;
};

type SourceImageValidationFailure = {
  ok: false;
  errorCode: BeaconImageErrorCode;
};

export type SourceImageValidationResult = SourceImageValidationSuccess | SourceImageValidationFailure;

type ValidateSourceImageFileInput = {
  file: File;
};

type ValidateSourceImageFileOptions = {
  maxSourceFileSizeBytes?: number;
  maxDecodedAreaPixels?: number;
};

type DecodeImageResult = {
  width: number;
  height: number;
};

type SourceImageFileValidator = {
  validate(
    input: ValidateSourceImageFileInput,
    options?: ValidateSourceImageFileOptions
  ): Promise<SourceImageValidationResult>;
};

type SourceImageFileValidatorDeps = {
  decodeImageFile: (file: File) => Promise<DecodeImageResult>;
};

function isSvgMimeType(mimeType: string): boolean {
  return mimeType.toLowerCase().startsWith("image/svg");
}

async function decodeImageFileViaObjectUrl(file: File): Promise<DecodeImageResult> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const dimensions = await new Promise<DecodeImageResult>((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error("Image decode failed"));
      image.src = objectUrl;
    });
    return dimensions;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function createSourceImageValidationFailure(errorCode: BeaconImageErrorCode): SourceImageValidationFailure {
  return { ok: false, errorCode };
}

function validateMimeType(mimeType: string): SourceImageValidationFailure | null {
  if (!mimeType?.startsWith("image/")) {
    return createSourceImageValidationFailure(BEACON_IMAGE_ERROR_CODES.SOURCE_IMAGE_TYPE_NOT_ALLOWED);
  }
  if (isSvgMimeType(mimeType)) {
    return createSourceImageValidationFailure(BEACON_IMAGE_ERROR_CODES.SOURCE_IMAGE_SVG_BLOCKED);
  }
  if (!ALLOWED_SOURCE_IMAGE_MIME_TYPES.has(mimeType)) {
    return createSourceImageValidationFailure(BEACON_IMAGE_ERROR_CODES.SOURCE_IMAGE_TYPE_NOT_ALLOWED);
  }
  return null;
}

function validateSourceSize(file: File, maxSourceFileSizeBytes: number): SourceImageValidationFailure | null {
  if (file.size > maxSourceFileSizeBytes) {
    return createSourceImageValidationFailure(BEACON_IMAGE_ERROR_CODES.SOURCE_IMAGE_TOO_LARGE);
  }
  return null;
}

function validateDecodedDimensions(
  decoded: DecodeImageResult,
  maxDecodedAreaPixels: number
): SourceImageValidationFailure | null {
  if (decoded.width <= 0 || decoded.height <= 0) {
    return createSourceImageValidationFailure(BEACON_IMAGE_ERROR_CODES.SOURCE_IMAGE_DECODE_FAILED);
  }
  if (decoded.width * decoded.height > maxDecodedAreaPixels) {
    return createSourceImageValidationFailure(BEACON_IMAGE_ERROR_CODES.SOURCE_IMAGE_TOO_MANY_PIXELS);
  }
  return null;
}

export function createSourceImageFileValidator(
  deps: Partial<SourceImageFileValidatorDeps> = {}
): SourceImageFileValidator {
  const decodeImageFile = deps.decodeImageFile ?? decodeImageFileViaObjectUrl;

  async function validate(
    input: ValidateSourceImageFileInput,
    options: ValidateSourceImageFileOptions = {}
  ): Promise<SourceImageValidationResult> {
    const { file } = input;
    const mimeType = file.type.trim().toLowerCase();

    const mimeValidationFailure = validateMimeType(mimeType);
    if (mimeValidationFailure) {
      return mimeValidationFailure;
    }

    const maxSourceFileSizeBytes = options.maxSourceFileSizeBytes ?? DEFAULT_MAX_SOURCE_FILE_SIZE_BYTES;
    const sourceSizeFailure = validateSourceSize(file, maxSourceFileSizeBytes);
    if (sourceSizeFailure) {
      return sourceSizeFailure;
    }

    let decoded: DecodeImageResult;
    try {
      decoded = await decodeImageFile(file);
    } catch {
      return createSourceImageValidationFailure(BEACON_IMAGE_ERROR_CODES.SOURCE_IMAGE_DECODE_FAILED);
    }

    const maxDecodedAreaPixels = options.maxDecodedAreaPixels ?? DEFAULT_MAX_DECODED_AREA_PIXELS;
    const decodedDimensionsFailure = validateDecodedDimensions(decoded, maxDecodedAreaPixels);
    if (decodedDimensionsFailure) {
      return decodedDimensionsFailure;
    }
    const decodedAreaPixels = decoded.width * decoded.height;

    return {
      ok: true,
      file,
      mimeType,
      width: decoded.width,
      height: decoded.height,
      megapixels: decodedAreaPixels / 1_000_000,
    };
  }

  return { validate };
}
