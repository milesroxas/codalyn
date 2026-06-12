/** Strip port and lowercase for host comparisons. */
function normalizeHostname(host: string): string {
  return host.replace(/:\d+$/, "").toLowerCase();
}

/**
 * Derive the marketing-site origin from a Tower app URL (e.g. tower.codalyn.app → codalyn.app,
 * tower-preview.codalyn.app → preview.codalyn.app). Returns null when the host is not a tower app subdomain.
 */
export function deriveMarketingOriginFromTowerAppUrl(appUrl: string): string | null {
  try {
    const { protocol, hostname } = new URL(appUrl.trim());
    const host = normalizeHostname(hostname);
    if (host.startsWith("tower.")) {
      return `${protocol}//${host.slice("tower.".length)}`;
    }
    if (host.startsWith("tower-")) {
      return `${protocol}//${host.slice("tower-".length)}`;
    }
  } catch {
    return null;
  }
  return null;
}
