import { loadBeaconDocs } from "@/features/docs/lib/beacon-docs";
import { BeaconDocsScreen } from "@/features/docs/ui/beacon-docs-screen";
import { createMarketingPageMetadata } from "@/server/marketing/marketing-seo";

export const dynamic = "force-static";

export const metadata = createMarketingPageMetadata("docs");

export default async function DocsPage() {
  const content = await loadBeaconDocs();

  return <BeaconDocsScreen content={content} />;
}
