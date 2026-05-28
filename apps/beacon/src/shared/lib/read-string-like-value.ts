/** Normalizes primitive or Webflow-style `{ value }` strings at API boundaries. */
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
