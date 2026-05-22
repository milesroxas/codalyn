import type * as React from "react";

import { cn } from "@/shared/lib/utils";

type SkeletonStatusProps = {
  label: string;
  children: React.ReactNode;
  className?: string;
};

/** Accessible loading shell for skeleton placeholders. */
function SkeletonStatus({ label, children, className }: SkeletonStatusProps) {
  return (
    <div aria-busy="true" aria-live="polite" className={cn(className)} role="status">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export { SkeletonStatus };
