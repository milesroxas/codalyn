import { XIcon } from "lucide-react";
import type * as React from "react";
import { Drawer as VaulDrawer } from "vaul";

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

function Drawer({ ...props }: React.ComponentProps<typeof VaulDrawer.Root>) {
  return <VaulDrawer.Root data-slot="drawer" repositionInputs={false} {...props} />;
}

function DrawerTrigger({ ...props }: React.ComponentProps<typeof VaulDrawer.Trigger>) {
  return <VaulDrawer.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal({ ...props }: React.ComponentProps<typeof VaulDrawer.Portal>) {
  return <VaulDrawer.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerClose({ ...props }: React.ComponentProps<typeof VaulDrawer.Close>) {
  return <VaulDrawer.Close data-slot="drawer-close" {...props} />;
}

function DrawerOverlay({ className, ...props }: React.ComponentProps<typeof VaulDrawer.Overlay>) {
  return (
    <VaulDrawer.Overlay
      data-slot="drawer-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
        className
      )}
      {...props}
    />
  );
}

function DrawerContent({
  className,
  children,
  showCloseButton = true,
  showDragHandle = true,
  ...props
}: React.ComponentProps<typeof VaulDrawer.Content> & {
  showCloseButton?: boolean;
  showDragHandle?: boolean;
}) {
  const closeControl = showCloseButton ? (
    <DrawerClose asChild>
      <Button
        type="button"
        variant="ghost"
        className="relative z-10 shrink-0"
        size="icon-sm"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <XIcon />
        <span className="sr-only">Close</span>
      </Button>
    </DrawerClose>
  ) : null;

  return (
    <DrawerPortal>
      <DrawerOverlay />
      <VaulDrawer.Content
        data-slot="drawer-content"
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[min(92vh,560px)] flex-col rounded-t-sm border-x border-t border-border bg-popover pb-[max(1rem,env(safe-area-inset-bottom))] ring-1 ring-foreground/10 outline-none duration-200",
          className
        )}
        {...props}
      >
        {showDragHandle && showCloseButton ? (
          <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-x-2 px-4 pt-3 pb-3">
            <span className="min-w-0" aria-hidden />
            <VaulDrawer.Handle
              aria-hidden
              className="pointer-events-auto mx-auto h-1 w-11 shrink-0 rounded-full bg-muted-foreground/30"
            />
            <div className="flex min-w-0 justify-end">{closeControl}</div>
          </div>
        ) : showDragHandle ? (
          <VaulDrawer.Handle
            aria-hidden
            className="mx-auto mt-3 mb-4 h-1 w-11 shrink-0 rounded-full bg-muted-foreground/30"
          />
        ) : showCloseButton ? (
          <div className="flex shrink-0 justify-end px-4 pt-2 pb-2">{closeControl}</div>
        ) : (
          <div className="mt-1 shrink-0" aria-hidden />
        )}
        <div className="flex min-h-0 flex-1 flex-col gap-0 overflow-y-auto px-4">{children}</div>
      </VaulDrawer.Content>
    </DrawerPortal>
  );
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn("relative flex shrink-0 flex-col gap-1.5 pb-4 text-center", className)}
      {...props}
    />
  );
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="drawer-footer" className={cn("mt-6 flex shrink-0 flex-col gap-2", className)} {...props} />;
}

function DrawerTitle({ className, ...props }: React.ComponentProps<typeof VaulDrawer.Title>) {
  return (
    <VaulDrawer.Title
      data-slot="drawer-title"
      className={cn("font-heading text-base font-medium leading-none", className)}
      {...props}
    />
  );
}

function DrawerDescription({ className, ...props }: React.ComponentProps<typeof VaulDrawer.Description>) {
  return (
    <VaulDrawer.Description
      data-slot="drawer-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  );
}

export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
};
