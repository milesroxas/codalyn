import { normalizeWebflowSiteShortName } from "./designer-deep-link.js";

export type WebflowSiteSummary = {
  id: string;
  displayName?: string;
  shortName?: string;
};

function readOptionalString(raw: unknown): string | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function parseWebflowSiteSummary(raw: unknown): WebflowSiteSummary | null {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const id = readOptionalString(record.id);
  if (id === undefined) {
    return null;
  }

  const displayName = readOptionalString(record.displayName);
  const shortName = normalizeWebflowSiteShortName(readOptionalString(record.shortName));

  return {
    id,
    ...(displayName !== undefined ? { displayName } : {}),
    ...(shortName !== null ? { shortName } : {}),
  };
}

export function parseWebflowSiteSummaries(raw: unknown): WebflowSiteSummary[] {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return [];
  }
  const sites = (raw as { sites?: unknown }).sites;
  if (!Array.isArray(sites)) {
    return [];
  }
  return sites.flatMap((site) => {
    const parsed = parseWebflowSiteSummary(site);
    return parsed ? [parsed] : [];
  });
}
