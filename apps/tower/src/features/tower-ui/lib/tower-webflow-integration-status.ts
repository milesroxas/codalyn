import type { StatTileTone } from "@/shared/ui/stat-tile";

type WebflowIntegrationStatusInput = {
  webflowOAuthConnected: boolean;
  /** Site count when loaded; null when sites were not fetched. */
  webflowSitesCount: number | null;
};

export function formatWebflowIntegrationStatus(input: WebflowIntegrationStatusInput): {
  value: string;
  hint: string;
  tone: StatTileTone;
} {
  if (!input.webflowOAuthConnected) {
    return { value: "Not connected", hint: "Data API proxy off", tone: "warn" };
  }

  const siteCount = input.webflowSitesCount;
  if (siteCount === null) {
    return { value: "Connected", hint: "Manage connection & sites", tone: "positive" };
  }

  return {
    value: "Connected",
    hint: siteCount === 0 ? "No sites returned" : `${siteCount} site${siteCount === 1 ? "" : "s"} available`,
    tone: "positive",
  };
}
