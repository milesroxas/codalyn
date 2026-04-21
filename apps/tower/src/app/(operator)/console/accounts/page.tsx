import type { Metadata } from "next";
import { OperatorAccounts } from "@/features/operator/ui/operator-accounts";

export const metadata: Metadata = {
  title: "Accounts · Operator",
};

export const dynamic = "force-dynamic";

export default function OperatorAccountsPage() {
  return <OperatorAccounts />;
}
