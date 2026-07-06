/**
 * Best-effort client IP from proxy headers. On Vercel the real client IP is the first entry of
 * `x-forwarded-for`. Used only for rate-limit keys, never for authz — spoofable behind untrusted
 * proxies, but Vercel overwrites it at the edge.
 */
export function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  return realIp || null;
}
