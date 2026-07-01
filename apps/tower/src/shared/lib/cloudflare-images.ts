/**
 * Cloudflare Images URL helpers.
 *
 * Boundary layer (see CLAUDE.md "Runtime Value-Shape Safety Rule"): the account
 * hash is external config and the image id is content; both may arrive as bare
 * strings or `{ value }` wrapped shapes. We normalize, match on the stable id, and
 * build the delivery URL. Missing/invalid input returns `null` — no invented URL.
 */

import { readStringLikeValue } from "@/shared/lib/cloudflare-stream";

const IMAGE_DELIVERY_HOST = "imagedelivery.net";
const DEFAULT_IMAGE_VARIANT = "public";

/** Normalize a Cloudflare Images account hash. Returns `null` if missing/malformed. */
export function normalizeImagesAccountHash(raw: unknown): string | null {
  const value = readStringLikeValue(raw);
  if (!value) return null;
  if (!/^[A-Za-z0-9._-]+$/.test(value)) return null;
  return value;
}

/** Normalize a Cloudflare Images image id (opaque url-safe token). Returns `null` if missing/malformed. */
export function normalizeImageId(raw: unknown): string | null {
  const value = readStringLikeValue(raw);
  if (!value) return null;
  if (!/^[A-Za-z0-9._-]+$/.test(value)) return null;
  return value;
}

export type ImageDeliveryInput = {
  imageId: unknown;
  accountHash: unknown;
  variant?: string;
};

/** Build a Cloudflare Images delivery URL. Requires both a valid account hash and image id. */
export function buildImageDeliveryUrl({ imageId, accountHash, variant }: ImageDeliveryInput): string | null {
  const hash = normalizeImagesAccountHash(accountHash);
  const id = normalizeImageId(imageId);
  if (!hash || !id) return null;
  const safeVariant = readStringLikeValue(variant) ?? DEFAULT_IMAGE_VARIANT;
  return `https://${IMAGE_DELIVERY_HOST}/${hash}/${id}/${encodeURIComponent(safeVariant)}`;
}
