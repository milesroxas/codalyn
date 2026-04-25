import type * as React from "react";
import { TowerHeader } from "@/features/tower-ui/tower-header";
import { isTowerBillingEnabled } from "@/server/billing/billing-feature";

export default function TowerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TowerHeader billingEnabled={isTowerBillingEnabled()} />
      {children}
    </>
  );
}
