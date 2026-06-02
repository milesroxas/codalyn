import type { ImageExportFormat } from "./output-formats.js";

/**
 * Image optimization credits.
 *
 * Tower-powered image optimization (especially AVIF) costs real processing effort that scales with
 * the output resolution. Credits model that effort for customers without exposing CPU seconds or raw
 * infra math: a small export uses 1 credit, while larger or more expensive exports use several.
 *
 * The function is intentionally a small, deterministic, tunable lookup so Tower (metering) and Beacon
 * (preview copy) agree on cost. Tune by editing the threshold tables below.
 */

export const IMAGE_OPTIMIZATION_MIN_CREDITS = 1;
export const IMAGE_OPTIMIZATION_MAX_CREDITS = 10;

/** Inputs are normalized at the integration boundary (e.g. Sharp metadata) before reaching here. */
export type ImageOptimizationCreditInput = {
  /** Output width in pixels (post-crop/resize); the value actually encoded. */
  outputWidth: number;
  /** Output height in pixels (post-crop/resize); the value actually encoded. */
  outputHeight: number;
  /** Output container format; AVIF is the expensive Tower path, WebP is materially cheaper. */
  format: ImageExportFormat;
  /** Optional source byte size; used only as a floor so heavy decodes never undercharge. */
  inputBytes?: number | null;
};

/**
 * AVIF-baseline credit cost by output megapixels. Ordered ascending; first matching tier wins and
 * anything above the last tier costs the maximum. Examples (AVIF):
 *  - 1280×720 (~0.9MP) → 1
 *  - 1920×1080 (~2.1MP) → 3
 *  - 2560×1440 (~3.7MP) → 5
 *  - 2560×2560 (~6.6MP) → 10
 */
const MEGAPIXEL_CREDIT_TIERS: ReadonlyArray<{ maxMegapixels: number; credits: number }> = [
  { maxMegapixels: 1, credits: 1 },
  { maxMegapixels: 2, credits: 2 },
  { maxMegapixels: 3, credits: 3 },
  { maxMegapixels: 4, credits: 5 },
  { maxMegapixels: 5, credits: 6 },
  { maxMegapixels: 6.5, credits: 8 },
];

/** Source-bytes credit floor: very large inputs are expensive to decode regardless of output size. */
const INPUT_BYTES_CREDIT_FLOORS: ReadonlyArray<{ maxBytes: number; credits: number }> = [
  { maxBytes: 8 * 1024 * 1024, credits: 1 },
  { maxBytes: 16 * 1024 * 1024, credits: 2 },
  { maxBytes: 24 * 1024 * 1024, credits: 4 },
];

/** WebP encodes much faster than AVIF, so it costs roughly half the AVIF effort. */
const WEBP_CREDIT_FACTOR = 0.5;

function normalizePositiveDimension(raw: number): number | null {
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) {
    return null;
  }
  return Math.floor(raw);
}

function clampCredits(credits: number): number {
  const rounded = Math.round(credits);
  return Math.min(IMAGE_OPTIMIZATION_MAX_CREDITS, Math.max(IMAGE_OPTIMIZATION_MIN_CREDITS, rounded));
}

function megapixelCredits(pixelCount: number): number {
  const megapixels = pixelCount / 1_000_000;
  for (const tier of MEGAPIXEL_CREDIT_TIERS) {
    if (megapixels <= tier.maxMegapixels) {
      return tier.credits;
    }
  }
  return IMAGE_OPTIMIZATION_MAX_CREDITS;
}

function inputBytesCreditFloor(inputBytes: number | null | undefined): number {
  if (typeof inputBytes !== "number" || !Number.isFinite(inputBytes) || inputBytes <= 0) {
    return IMAGE_OPTIMIZATION_MIN_CREDITS;
  }
  for (const floor of INPUT_BYTES_CREDIT_FLOORS) {
    if (inputBytes <= floor.maxBytes) {
      return floor.credits;
    }
  }
  return 6;
}

/**
 * Calculates the image optimization credits to charge for one optimize request.
 *
 * Deterministic: same inputs always return the same credit count in `[1, 10]`. Invalid/unknown output
 * dimensions fail safe to the maximum (never undercharge) rather than silently inventing a fallback.
 */
export function calculateImageOptimizationCredits(input: ImageOptimizationCreditInput): number {
  const width = normalizePositiveDimension(input.outputWidth);
  const height = normalizePositiveDimension(input.outputHeight);
  if (width == null || height == null) {
    return IMAGE_OPTIMIZATION_MAX_CREDITS;
  }

  const baseline = Math.max(megapixelCredits(width * height), inputBytesCreditFloor(input.inputBytes));
  const weighted = input.format === "webp" ? baseline * WEBP_CREDIT_FACTOR : baseline;
  return clampCredits(weighted);
}
