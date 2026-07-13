import type { Metadata } from "next";
import { TowerSupportScreen } from "@/features/tower-ui/ui/tower-support-screen";
import { buildMarketingMetadata } from "@/server/marketing/marketing-seo";
import { buildMarketingUrl } from "@/server/tower-hosts";

export const metadata: Metadata = buildMarketingMetadata({
  title: "Support",
  description: "Request help or send feedback to the Codalyn team. We follow up by email.",
  canonicalUrl: buildMarketingUrl("/support"),
});

export default function SupportPage() {
  return <TowerSupportScreen />;
}
