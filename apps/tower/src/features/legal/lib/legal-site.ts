/** Shared legal metadata — single source of truth for placeholders in markdown documents. */
export const LEGAL_SITE = {
  companyName: "Codalyn",
  productName: "Tower",
  marketingSiteUrl: "https://codalyn.app",
  appSiteUrl: "https://tower.codalyn.app",
  contactEmail: "support@codalyn.app",
  /** ISO date shown in document headers (YYYY-MM-DD). Update when publishing revisions. */
  effectiveDate: "2026-07-11",
  lastUpdatedDate: "2026-07-11",
  governingLawJurisdiction: "State of Delaware, United States",
} as const;

export type LegalDocumentId = "terms-of-service" | "privacy-policy";

export const LEGAL_DOCUMENTS: Record<
  LegalDocumentId,
  {
    slug: "terms" | "privacy";
    title: string;
    description: string;
    filename: string;
  }
> = {
  "terms-of-service": {
    slug: "terms",
    title: "Terms of Service",
    description: "The rules and conditions for using Codalyn Tower and related services.",
    filename: "terms-of-service.md",
  },
  "privacy-policy": {
    slug: "privacy",
    title: "Privacy Policy",
    description: "How Codalyn collects, uses, and protects personal information.",
    filename: "privacy-policy.md",
  },
};
