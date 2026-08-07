import Link from "next/link";

import { BEACON_DOCS_META } from "@/features/docs/lib/beacon-docs";
import { TOWER_PRIVACY_PATH, TOWER_SUPPORT_PATH } from "@/shared/lib/navigation/tower-marketing-paths";
import { Button } from "@/shared/ui/button";
import { LegalDocumentLayout } from "@/shared/ui/legal-document-layout";

type BeaconDocsScreenProps = {
  content: string;
};

function BeaconDocsScreen({ content }: BeaconDocsScreenProps) {
  return (
    <LegalDocumentLayout
      title={BEACON_DOCS_META.title}
      description={BEACON_DOCS_META.description}
      lastUpdated={BEACON_DOCS_META.lastUpdatedDate}
      content={content}
      footer={
        <>
          <Button variant="outline" size="sm" asChild>
            <Link href={TOWER_SUPPORT_PATH}>Support</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={TOWER_PRIVACY_PATH}>Privacy Policy</Link>
          </Button>
          <Button variant="link" size="sm" asChild>
            <Link href="/">Back to home</Link>
          </Button>
        </>
      }
    />
  );
}

export { BeaconDocsScreen };
