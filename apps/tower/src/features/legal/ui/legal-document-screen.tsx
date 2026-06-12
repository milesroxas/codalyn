import Link from "next/link";

import { LEGAL_SITE } from "@/features/legal/lib/legal-site";
import { Button } from "@/shared/ui/button";
import { LegalDocumentLayout } from "@/shared/ui/legal-document-layout";

type LegalDocumentScreenProps = {
  title: string;
  description: string;
  content: string;
  relatedHref: "/terms" | "/privacy";
  relatedLabel: string;
};

function LegalDocumentScreen({ title, description, content, relatedHref, relatedLabel }: LegalDocumentScreenProps) {
  return (
    <LegalDocumentLayout
      title={title}
      description={description}
      lastUpdated={LEGAL_SITE.lastUpdatedDate}
      content={content}
      footer={
        <>
          <Button variant="outline" size="sm" asChild>
            <Link href={relatedHref}>{relatedLabel}</Link>
          </Button>
          <Button variant="link" size="sm" asChild>
            <Link href="/">Back to home</Link>
          </Button>
        </>
      }
    />
  );
}

export { LegalDocumentScreen };
