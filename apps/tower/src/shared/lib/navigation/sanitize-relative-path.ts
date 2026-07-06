/** Opaque base used only to detect whether a candidate resolves off-origin. Never emitted. */
const SAME_ORIGIN_BASE = "https://sanitize-relative-path.invalid";

/**
 * Reject open-redirect / off-origin redirect targets, returning a safe same-app path.
 *
 * A `startsWith("//")` check alone is NOT enough: the WHATWG URL parser (and browsers) treat
 * backslashes as slashes for special schemes and strip tab/CR/LF, so `"/\\evil.com"`, `"/\tevil.com"`,
 * and `"/\r/\nevil.com"` all resolve to a foreign origin. `URLSearchParams.get` also decodes `%5C`→`\`
 * before this runs. We therefore resolve the candidate against a fixed base and reject anything whose
 * origin changes, then rebuild the result from the parsed URL so only same-origin path/query/hash
 * survive (this also strips any smuggled CR/LF).
 */
export function sanitizeRelativePath(pathname: string, search = ""): string {
  const raw = `${pathname}${search}`;
  if (!raw.startsWith("/")) {
    return "/";
  }
  let resolved: URL;
  try {
    resolved = new URL(raw, SAME_ORIGIN_BASE);
  } catch {
    return "/";
  }
  if (resolved.origin !== SAME_ORIGIN_BASE) {
    return "/";
  }
  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}
