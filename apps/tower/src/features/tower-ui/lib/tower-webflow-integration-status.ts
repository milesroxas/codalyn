import type { StatTileTone, StatTileValueVariant } from "@/shared/ui/stat-tile";

type WebflowIntegrationStatusInput = {
  webflowOAuthConnected: boolean;
  /** Site count when loaded; null when sites were not fetched. */
  webflowSitesCount: number | null;
};

export type WebflowIntegrationStatusSnapshot = {
  value: string;
  valueVariant: StatTileValueVariant;
  caption: string;
  tone: StatTileTone;
};

export function formatWebflowIntegrationStatus(input: WebflowIntegrationStatusInput): WebflowIntegrationStatusSnapshot {
  if (!input.webflowOAuthConnected) {
    return {
      value: "Not connected",
      valueVariant: "status",
      caption: "Connect Webflow to sync sites and use workspace tools.",
      tone: "warn",
    };
  }

  if (input.webflowSitesCount === 0) {
    return {
      value: "Action needed",
      valueVariant: "status",
      caption: "Reconnect Webflow to keep site data in sync.",
      tone: "warn",
    };
  }

  return {
    value: "Connected",
    valueVariant: "status",
    caption: "Your workspace can access Webflow sites.",
    tone: "positive",
  };
}
