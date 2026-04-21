import type * as React from "react";
import { TowerHeader } from "@/features/tower-ui/tower-header";

export default function TowerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TowerHeader />
      {children}
    </>
  );
}
