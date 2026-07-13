import type { Metadata } from "next";
import { Suspense } from "react";
import { OperatorWorkspaces } from "@/features/operator/ui/operator-workspaces";

export const metadata: Metadata = {
  title: "Workspaces · Operator",
};

export const dynamic = "force-dynamic";

export default function OperatorWorkspacesPage() {
  return (
    <Suspense fallback={null}>
      <OperatorWorkspaces />
    </Suspense>
  );
}
