import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import type * as React from "react";

import { cn } from "@/shared/lib/utils";

const statusMessageVariants = cva("", {
  variants: {
    layout: {
      block: "",
      inline: "inline-flex items-center gap-1",
    },
    tone: {
      muted: "text-muted-foreground",
      warning: "text-amber-600 dark:text-amber-500",
      danger: "text-destructive",
    },
    size: {
      sm: "text-xs",
      default: "text-sm",
    },
  },
  defaultVariants: {
    layout: "block",
    tone: "muted",
    size: "default",
  },
});

type StatusMessageProps = React.ComponentProps<"p"> &
  VariantProps<typeof statusMessageVariants> & {
    pending?: boolean;
  };

function StatusMessage(props: StatusMessageProps) {
  const { pending = false, layout, tone, size, className, children, ...rest } = props;

  return (
    <p
      role="status"
      data-slot="status-message"
      data-pending={pending ? "true" : "false"}
      className={cn(statusMessageVariants({ layout: pending ? "inline" : layout, tone, size }), className)}
      {...rest}
    >
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </p>
  );
}

export { StatusMessage };
