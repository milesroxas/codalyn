import type { Media, StreamVideo } from "@/payload-types";
import { normalizeStreamUid } from "@/shared/lib/cloudflare-stream";

/**
 * Boundary normalizers for Payload relation values (see CLAUDE.md "Runtime
 * Value-Shape Safety Rule"): relations arrive populated at depth > 0 but as a
 * bare numeric id at depth 0, and stored fields may carry legacy/malformed
 * data. Invalid input resolves to `null` — callers decide how to degrade.
 */

/**
 * Resolve an upload relation to a populated `Media` doc. Only the populated
 * shape carries a usable URL.
 */
export function resolveCmsMedia(value: number | Media | null | undefined): Media | null {
  if (!value || typeof value === "number") {
    return null;
  }
  return typeof value.url === "string" && value.url.length > 0 ? value : null;
}

export type ResolvedStreamVideo = {
  /** Normalized Cloudflare Stream video UID. */
  uid: string;
  /** Editor-facing title, used as the player accessibility label. */
  title: string;
  /** Poster URL from the optional media relation; `null` falls back to the Stream thumbnail. */
  posterUrl: string | null;
};

/**
 * Resolve a `stream-videos` relation to a normalized playback descriptor.
 * Requires a populated doc with a valid UID; the optional poster degrades to
 * `null` (players fall back to the Stream thumbnail) rather than blocking
 * playback.
 */
export function resolveCmsStreamVideo(value: number | StreamVideo | null | undefined): ResolvedStreamVideo | null {
  if (!value || typeof value === "number") {
    return null;
  }
  const uid = normalizeStreamUid(value.uid);
  if (!uid) {
    return null;
  }
  const title = typeof value.title === "string" && value.title.trim().length > 0 ? value.title.trim() : "Video";
  return {
    uid,
    title,
    posterUrl: resolveCmsMedia(value.poster)?.url ?? null,
  };
}
