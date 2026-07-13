import { getLegalDocumentMeta, loadLegalDocument } from "@/features/legal/lib/load-legal-document";
import { LegalDocumentScreen } from "@/features/legal/ui/legal-document-screen";
import { createMarketingPageMetadata } from "@/server/marketing/marketing-seo";

export const dynamic = "force-static";

const meta = getLegalDocumentMeta("terms-of-service");

export const metadata = createMarketingPageMetadata("terms");

export default async function TermsPage() {
  const content = await loadLegalDocument("terms-of-service");

  return (
    <LegalDocumentScreen
      title={meta.title}
      description={meta.description}
      content={content}
      relatedHref="/privacy"
      relatedLabel="Privacy Policy"
    />
  );
}
