import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { LEGAL_DOCUMENTS, LEGAL_SITE, type LegalDocumentId } from "@/features/legal/lib/legal-site";

const LEGAL_CONTENT_DIR = join(process.cwd(), "src/features/legal/content");

const LEGAL_PLACEHOLDERS: Record<string, string> = {
  COMPANY_NAME: LEGAL_SITE.companyName,
  PRODUCT_NAME: LEGAL_SITE.productName,
  MARKETING_SITE_URL: LEGAL_SITE.marketingSiteUrl,
  APP_SITE_URL: LEGAL_SITE.appSiteUrl,
  CONTACT_EMAIL: LEGAL_SITE.contactEmail,
  EFFECTIVE_DATE: LEGAL_SITE.effectiveDate,
  LAST_UPDATED_DATE: LEGAL_SITE.lastUpdatedDate,
  GOVERNING_LAW_JURISDICTION: LEGAL_SITE.governingLawJurisdiction,
};

function applyLegalPlaceholders(markdown: string): string {
  return markdown.replace(/\{\{([A-Z_]+)\}\}/g, (match, key: string) => {
    return LEGAL_PLACEHOLDERS[key] ?? match;
  });
}

export async function loadLegalDocument(id: LegalDocumentId): Promise<string> {
  const { filename } = LEGAL_DOCUMENTS[id];
  const raw = await readFile(join(LEGAL_CONTENT_DIR, filename), "utf8");
  return applyLegalPlaceholders(raw);
}

export function getLegalDocumentMeta(id: LegalDocumentId) {
  return LEGAL_DOCUMENTS[id];
}
