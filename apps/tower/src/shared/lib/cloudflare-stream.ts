/**
 * Cloudflare Stream URL helpers.
 *
 * Boundary layer (see CLAUDE.md "Runtime Value-Shape Safety Rule"): the customer
 * subdomain is external config that may arrive as a bare host, a full URL, or a
 * `{ value }` wrapped shape. We normalize it here, match on stable UIDs, and build
 * playback/thumbnail URLs. Missing/invalid input returns `null` rather than an
 * invented fallback — callers decide how to degrade.
 */

const CLOUDFLARE_STREAM_HOST_SUFFIX = ".cloudflarestream.com";

/** Read a string-like config value from primitive or `{ value }` wrapped shapes. */
export function readStringLikeValue(raw: unknown): string | null {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (raw && typeof raw === "object" && "value" in raw) {
    return readStringLikeValue((raw as { value: unknown }).value);
  }
  return null;
}

/**
 * Normalize a Cloudflare Stream customer subdomain to a bare lowercase host.
 * Accepts `customer-xxx.cloudflarestream.com`, a `https://` URL form, or a
 * trailing-slash/path variant. Returns `null` when absent or not a
 * cloudflarestream.com host.
 */
export function normalizeCustomerSubdomain(raw: unknown): string | null {
  const value = readStringLikeValue(raw);
  if (!value) return null;
  const host = value
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .toLowerCase();
  if (host === CLOUDFLARE_STREAM_HOST_SUFFIX.slice(1)) return null; // bare "cloudflarestream.com"
  if (!host.endsWith(CLOUDFLARE_STREAM_HOST_SUFFIX)) return null;
  return host;
}

/** Normalize a Stream video UID (opaque url-safe token). Returns `null` if missing/malformed. */
export function normalizeStreamUid(raw: unknown): string | null {
  const value = readStringLikeValue(raw);
  if (!value) return null;
  // UIDs are url-safe opaque tokens; reject anything carrying path/query characters.
  if (!/^[A-Za-z0-9._-]+$/.test(value)) return null;
  return value;
}

export type StreamUrlInput = {
  uid: unknown;
  customerSubdomain: unknown;
};

/** Build the HLS manifest URL for a video. Requires both a valid UID and subdomain. */
export function buildStreamManifestUrl({ uid, customerSubdomain }: StreamUrlInput): string | null {
  const host = normalizeCustomerSubdomain(customerSubdomain);
  const id = normalizeStreamUid(uid);
  if (!host || !id) return null;
  return `https://${host}/${id}/manifest/video.m3u8`;
}

/** Build the poster/thumbnail URL for a video. Requires both a valid UID and subdomain. */
export function buildStreamThumbnailUrl(
  { uid, customerSubdomain }: StreamUrlInput,
  options?: { time?: string }
): string | null {
  const host = normalizeCustomerSubdomain(customerSubdomain);
  const id = normalizeStreamUid(uid);
  if (!host || !id) return null;
  const query = options?.time ? `?time=${encodeURIComponent(options.time)}` : "";
  return `https://${host}/${id}/thumbnails/thumbnail.jpg${query}`;
}
