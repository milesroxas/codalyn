import type { Metadata } from "next";
import type * as React from "react";
import { OperatorGate } from "@/features/operator/ui/operator-gate";

export const metadata: Metadata = {
  title: "Operator · Tower",
  description: "Product administration and platform operations for Tower.",
};

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return <OperatorGate>{children}</OperatorGate>;
}
