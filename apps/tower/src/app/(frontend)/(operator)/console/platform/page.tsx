import type { Metadata } from "next";
import { OperatorPlatform } from "@/features/operator/ui/operator-platform";

export const metadata: Metadata = {
  title: "Platform · Operator",
};

export const dynamic = "force-dynamic";

export default function OperatorPlatformPage() {
  return <OperatorPlatform />;
}
