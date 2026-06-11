import type * as React from "react";

import { AuthShell } from "@/features/tower-ui/auth-shell";

export function EarlyAccessPageShell({ children }: { children: React.ReactNode }) {
  return <AuthShell contentWidth="lg">{children}</AuthShell>;
}
