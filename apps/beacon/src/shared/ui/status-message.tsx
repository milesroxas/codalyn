import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import type * as React from "react";

import { cn } from "@/shared/lib/utils";

const statusMessageVariants = cva("text-sm text-muted-foreground", {
  variants: {
    layout: {
      block: "",
      inline: "inline-flex items-center gap-1",
    },
  },
  defaultVariants: {
    layout: "block",
  },
});

type StatusMessageProps = React.ComponentProps<"p"> &
  VariantProps<typeof statusMessageVariants> & {
    pending?: boolean;
  };

function StatusMessage(props: StatusMessageProps) {
  const { pending = false, layout, className, children, ...rest } = props;

  return (
    <p
      role="status"
      data-slot="status-message"
      data-pending={pending ? "true" : "false"}
      className={cn(statusMessageVariants({ layout: pending ? "inline" : layout }), className)}
      {...rest}
    >
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </p>
  );
}

export { StatusMessage };
