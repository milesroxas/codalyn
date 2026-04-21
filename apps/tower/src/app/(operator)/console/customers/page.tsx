import type { Metadata } from "next";
import { Suspense } from "react";
import { OperatorCustomers } from "@/features/operator/ui/operator-customers";

export const metadata: Metadata = {
  title: "Customers · Operator",
};

export const dynamic = "force-dynamic";

export default function OperatorCustomersPage() {
  return (
    <Suspense fallback={null}>
      <OperatorCustomers />
    </Suspense>
  );
}
