import type { Metadata } from "next";

import { LEGAL_DOCUMENTS } from "@/features/legal/lib/legal-site";
import { BEACON_MARKETING_COPY } from "@/features/marketing/beacon/lib/beacon-marketing-content";
import { FLINT_MARKETING_COPY } from "@/features/marketing/flint/lib/flint-marketing-content";
import { TOWER_MARKETING_COPY } from "@/features/marketing/tower/lib/tower-marketing-content";
import { buildFlintMarketingUrl, buildMarketingUrl, resolveMarketingOrigin } from "@/server/tower-hosts";

export const CODALYN_HOME_MARKETING_COPY = {
  title: "Codalyn",
  description:
    "Your Webflow workspace, unified — a connected layer for the tools, workflows, and infrastructure your workspace depends on.",
} as const;

export const MARKETING_SEO_SITE = {
  siteName: "Codalyn",
  locale: "en_US",
} as const;

export type MarketingPageId = "home" | "tower" | "beacon" | "flint" | "privacy" | "terms";

type MarketingPageCopy = {
  title: string;
  description: string;
};

export function getMarketingPageCopy(pageId: MarketingPageId): MarketingPageCopy {
  switch (pageId) {
    case "home":
      return CODALYN_HOME_MARKETING_COPY;
    case "tower":
      return TOWER_MARKETING_COPY;
    case "beacon":
      return BEACON_MARKETING_COPY;
    case "flint":
      return FLINT_MARKETING_COPY;
    case "privacy": {
      const { title, description } = LEGAL_DOCUMENTS["privacy-policy"];
      return { title, description };
    }
    case "terms": {
      const { title, description } = LEGAL_DOCUMENTS["terms-of-service"];
      return { title, description };
    }
  }
}

/** Canonical marketing URL for each public page (host-split aware). */
export function resolveMarketingCanonicalUrl(pageId: MarketingPageId): string {
  switch (pageId) {
    case "home":
      return buildMarketingUrl("/");
    case "tower":
      return buildMarketingUrl("/tower");
    case "beacon":
      return buildMarketingUrl("/beacon");
    case "flint":
      return buildFlintMarketingUrl("/");
    case "privacy":
      return buildMarketingUrl("/privacy");
    case "terms":
      return buildMarketingUrl("/terms");
  }
}

function formatMarketingTitle(title: string): string {
  if (title === MARKETING_SEO_SITE.siteName) {
    return title;
  }
  return `${title} | ${MARKETING_SEO_SITE.siteName}`;
}

type BuildMarketingMetadataInput = {
  title: string;
  description: string;
  canonicalUrl: string;
};

export function buildMarketingMetadata(input: BuildMarketingMetadataInput): Metadata {
  const { title, description, canonicalUrl } = input;
  const formattedTitle = formatMarketingTitle(title);

  return {
    title: formattedTitle,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "website",
      siteName: MARKETING_SEO_SITE.siteName,
      locale: MARKETING_SEO_SITE.locale,
      title: formattedTitle,
      description,
      url: canonicalUrl,
    },
    twitter: {
      card: "summary",
      title: formattedTitle,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export function createMarketingPageMetadata(pageId: MarketingPageId): Metadata {
  const { title, description } = getMarketingPageCopy(pageId);
  return buildMarketingMetadata({
    title,
    description,
    canonicalUrl: resolveMarketingCanonicalUrl(pageId),
  });
}

/** Root layout `metadataBase` for resolving relative social image URLs. */
export function resolveMarketingMetadataBase(): URL {
  return new URL(resolveMarketingOrigin());
}
