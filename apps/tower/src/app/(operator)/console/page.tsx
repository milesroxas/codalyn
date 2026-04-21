import type { Metadata } from "next";
import { OperatorOverview } from "@/features/operator/ui/operator-overview";

export const metadata: Metadata = {
  title: "Overview · Operator",
};

export const dynamic = "force-dynamic";

export default function OperatorOverviewPage() {
  return <OperatorOverview />;
}
