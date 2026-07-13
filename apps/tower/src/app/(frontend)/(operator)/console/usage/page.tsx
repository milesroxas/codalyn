import type { Metadata } from "next";
import { OperatorUsage } from "@/features/operator/ui/operator-usage";

export const metadata: Metadata = {
  title: "Usage & metering · Operator",
};

export const dynamic = "force-dynamic";

export default function OperatorUsagePage() {
  return <OperatorUsage />;
}
