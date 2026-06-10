import type * as React from "react";

import { cn } from "@/shared/lib/utils";

type CodalynLogoProps = React.ComponentProps<"span">;

function CodalynLogo({ className, ...props }: CodalynLogoProps) {
  return (
    <span className={cn("text-sm font-semibold tracking-tight", className)} {...props}>
      Codalyn
    </span>
  );
}

export { CodalynLogo };
