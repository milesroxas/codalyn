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

export function formatWebflowLinkedSitesCaption(count: number): string {
  return `${count} site${count === 1 ? "" : "s"} linked`;
}

export function getWebflowConnectionCardCopy(input: { webflowOAuthConnected: boolean; sitesCount: number }): {
  description: string | null;
  detail: string;
} {
  if (!input.webflowOAuthConnected) {
    return {
      description: "Authorize access so Beacon and Tower can use your Webflow sites.",
      detail: "Use Connect Webflow above.",
    };
  }

  if (input.sitesCount === 0) {
    return {
      description: "No sites were returned. Relink if your Webflow access changed recently.",
      detail: "Use Relink Webflow above.",
    };
  }

  return {
    description: null,
    detail: formatWebflowLinkedSitesCaption(input.sitesCount),
  };
}

export function formatWebflowIntegrationStatus(input: WebflowIntegrationStatusInput): WebflowIntegrationStatusSnapshot {
  if (!input.webflowOAuthConnected) {
    return {
      value: "Not connected",
      valueVariant: "status",
      caption: "Open Connection to link your account.",
      tone: "warn",
    };
  }

  if (input.webflowSitesCount === 0) {
    return {
      value: "Action needed",
      valueVariant: "status",
      caption: "Relink to refresh site access.",
      tone: "warn",
    };
  }

  return {
    value: "Connected",
    valueVariant: "status",
    caption:
      input.webflowSitesCount === null ? "Linked to Webflow" : formatWebflowLinkedSitesCaption(input.webflowSitesCount),
    tone: "positive",
  };
}
