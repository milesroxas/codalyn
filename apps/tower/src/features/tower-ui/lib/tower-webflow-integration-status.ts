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

function formatWebflowLinkedSitesCaption(count: number): string {
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

/**
 * Whether the Webflow site currently open in the Designer is usable from this workspace. Sites are
 * authorized at the workspace level (one OAuth token grants all sites it can see), so a site is
 * "linked" when it appears in that workspace's authorized site list — matched by stable site id.
 */
export type CurrentSiteLinkState = "linked" | "needs-relink" | "needs-connect";

export function resolveCurrentSiteLinkState(input: {
  webflowOAuthConnected: boolean;
  currentSiteLinked: boolean;
}): CurrentSiteLinkState {
  if (input.currentSiteLinked) {
    return "linked";
  }
  return input.webflowOAuthConnected ? "needs-relink" : "needs-connect";
}

/** Affordance copy for the current Designer site: what state it's in and what the user should do next. */
export function getCurrentSiteLinkNotice(state: CurrentSiteLinkState): {
  tone: "positive" | "warn";
  badge: string;
  title: string;
  detail: string;
} {
  switch (state) {
    case "linked":
      return {
        tone: "positive",
        badge: "Linked",
        title: "This site is linked",
        detail: "The site you opened in the Designer is authorized for this workspace.",
      };
    case "needs-relink":
      return {
        tone: "warn",
        badge: "Action needed",
        title: "This site isn’t linked yet",
        detail:
          "The site you opened in the Designer isn’t among this workspace’s authorized sites. Relink Webflow below to include it, or switch to the workspace that owns it.",
      };
    case "needs-connect":
      return {
        tone: "warn",
        badge: "Action needed",
        title: "Connect Webflow to link this site",
        detail:
          "The site you opened in the Designer can’t be used until you authorize Webflow for this workspace. Use Connect Webflow above.",
      };
  }
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
