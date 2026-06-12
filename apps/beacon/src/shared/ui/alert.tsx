import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { useLayoutEffect, useRef, useState } from "react";

import { beaconAppHorizontalInsetClass } from "@/shared/lib/beacon-app-route-surface";
import { cn } from "@/shared/lib/utils";

const flushAlertEnterMotionClass = cn(
  "motion-reduce:transition-none motion-reduce:transform-none",
  "motion-safe:transition-[opacity,transform] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]"
);

function flushAlertEnterVisibleClass(entered: boolean) {
  return entered
    ? "motion-safe:translate-y-0 motion-safe:opacity-100"
    : "motion-safe:-translate-y-1 motion-safe:opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100";
}

function useFlushAlertEnter(enabled: boolean): boolean {
  const [entered, setEntered] = useState(!enabled);
  const enterRafRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (!enabled) {
      setEntered(true);
      return undefined;
    }

    setEntered(false);
    enterRafRef.current = requestAnimationFrame(() => {
      enterRafRef.current = requestAnimationFrame(() => {
        enterRafRef.current = null;
        setEntered(true);
      });
    });

    return () => {
      if (enterRafRef.current != null) {
        cancelAnimationFrame(enterRafRef.current);
        enterRafRef.current = null;
      }
    };
  }, [enabled]);

  return entered;
}

const alertVariants = cva(
  "group/alert relative grid w-full text-left has-[>svg]:grid-cols-[auto_1fr] *:[svg]:row-span-2 *:[svg]:text-current",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        info: "border-border/80 bg-muted/35 text-foreground *:data-[slot=alert-description]:text-muted-foreground *:[svg]:text-muted-foreground",
        warning:
          "border-amber-500/35 bg-amber-500/10 text-foreground *:data-[slot=alert-description]:text-muted-foreground *:[svg]:text-amber-600 dark:*:[svg]:text-amber-400",
        destructive:
          "bg-card text-destructive *:data-[slot=alert-description]:text-destructive/90 *:[svg]:text-current",
      },
      size: {
        default:
          "gap-0.5 px-2.5 py-2 text-sm has-data-[alert-action-placement=corner]:pr-18 has-[>svg]:gap-x-2 *:[svg]:translate-y-0.5 *:[svg:not([class*='size-'])]:size-4",
        compact:
          "items-center gap-0 px-2 py-2.5 text-xs has-data-[alert-action-placement=corner]:pr-11 has-[>svg]:grid-cols-[auto_minmax(0,1fr)] has-[>svg]:gap-x-2 data-[size=compact]:*:[svg]:row-span-1 data-[size=compact]:*:[svg]:self-center *:[svg]:translate-y-0 *:[svg:not([class*='size-'])]:size-3.5",
      },
      // `card` is the standalone alert shape; `flush` is a borderless full-bleed strip beneath app chrome.
      frame: {
        card: "rounded-sm border",
        flush: cn("rounded-none border-0", beaconAppHorizontalInsetClass),
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      frame: "card",
    },
    compoundVariants: [
      {
        size: "compact",
        frame: "flush",
        // Strip scale: 12px title (text-xs), 14px leading icon (size-3.5), pair actions with Button `2xs`.
        class:
          "py-3.5 text-xs leading-snug has-data-[alert-action-placement=corner]:pr-20 *:[svg:not([class*='size-'])]:size-3.5",
      },
    ],
  }
);

function Alert({
  className,
  variant,
  size,
  frame,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  const isFlushFrame = frame === "flush";
  const flushEntered = useFlushAlertEnter(isFlushFrame);

  return (
    <div
      data-slot="alert"
      data-size={size ?? "default"}
      data-frame={frame ?? "card"}
      role="alert"
      className={cn(
        alertVariants({ variant, size, frame }),
        isFlushFrame && flushAlertEnterMotionClass,
        isFlushFrame && flushAlertEnterVisibleClass(flushEntered),
        className
      )}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "font-medium group-has-[>svg]/alert:col-start-2 group-data-[size=compact]/alert:font-normal group-data-[size=compact]/alert:min-w-0 group-data-[size=compact]/alert:self-center group-data-[size=compact]/alert:truncate group-data-[size=compact]/alert:leading-snug [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-sm text-balance text-muted-foreground md:text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4",
        className
      )}
      {...props}
    />
  );
}

const alertActionVariants = cva("", {
  variants: {
    // `corner` floats a compact action top-right (reserves `pr-18` on the alert);
    // `block` keeps the action in the text column for wide actions / narrow panels where a
    // floated label would overlap the title.
    placement: {
      corner:
        "absolute top-1/2 -translate-y-1/2 group-data-[size=compact]/alert:flex group-data-[size=compact]/alert:items-center group-data-[size=compact]/alert:*:data-[slot=button]:font-normal group-data-[frame=flush]/alert:right-3 group-data-[frame=card]/alert:right-2 group-data-[frame=card]/alert:group-data-[size=compact]/alert:right-1",
      block:
        "col-start-2 mt-2.5 flex flex-wrap items-center gap-2 group-data-[size=compact]/alert:mt-1 group-data-[size=compact]/alert:justify-end",
    },
  },
  defaultVariants: {
    placement: "corner",
  },
});

function AlertAction({
  className,
  placement = "corner",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertActionVariants>) {
  return (
    <div
      data-slot="alert-action"
      data-alert-action-placement={placement ?? "corner"}
      className={cn(alertActionVariants({ placement }), className)}
      {...props}
    />
  );
}

export { Alert, AlertAction, AlertDescription, AlertTitle };
