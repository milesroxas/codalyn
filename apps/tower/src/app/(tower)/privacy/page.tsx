import { getLegalDocumentMeta, loadLegalDocument } from "@/features/legal/lib/load-legal-document";
import { LegalDocumentScreen } from "@/features/legal/ui/legal-document-screen";
import { createMarketingPageMetadata } from "@/server/marketing/marketing-seo";

export const dynamic = "force-static";

const meta = getLegalDocumentMeta("privacy-policy");

export const metadata = createMarketingPageMetadata("privacy");

export default async function PrivacyPage() {
  const content = await loadLegalDocument("privacy-policy");

  return (
    <LegalDocumentScreen
      title={meta.title}
      description={meta.description}
      content={content}
      relatedHref="/terms"
      relatedLabel="Terms of Service"
    />
  );
}
