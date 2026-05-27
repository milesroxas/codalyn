import { cva, type VariantProps } from "class-variance-authority";
import { XIcon } from "lucide-react";
import { Children, type ComponentProps, isValidElement, type ReactNode } from "react";
import { Drawer as VaulDrawer } from "vaul";

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

function Drawer({ ...props }: ComponentProps<typeof VaulDrawer.Root>) {
  return <VaulDrawer.Root data-slot="drawer" repositionInputs={false} {...props} />;
}

function DrawerTrigger({ ...props }: ComponentProps<typeof VaulDrawer.Trigger>) {
  return <VaulDrawer.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal({ ...props }: ComponentProps<typeof VaulDrawer.Portal>) {
  return <VaulDrawer.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerClose({ ...props }: ComponentProps<typeof VaulDrawer.Close>) {
  return <VaulDrawer.Close data-slot="drawer-close" {...props} />;
}

function DrawerOverlay({ className, ...props }: ComponentProps<typeof VaulDrawer.Overlay>) {
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
  stickyFooter = false,
  ...props
}: ComponentProps<typeof VaulDrawer.Content> & {
  showCloseButton?: boolean;
  showDragHandle?: boolean;
  /** When true, `DrawerHeader` and `DrawerFooter` stay fixed; other children scroll in between. */
  stickyFooter?: boolean;
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
        {stickyFooter ? (
          (() => {
            const nodes = Children.toArray(children);
            const headerBlocks: ReactNode[] = [];
            const footerBlocks: ReactNode[] = [];
            const mainBlocks: ReactNode[] = [];
            for (const node of nodes) {
              if (isValidElement(node) && node.type === DrawerFooter) {
                footerBlocks.push(node);
              } else if (isValidElement(node) && node.type === DrawerHeader) {
                headerBlocks.push(node);
              } else {
                mainBlocks.push(node);
              }
            }
            return (
              <div className="flex min-h-0 min-w-0 flex-1 flex-col px-4">
                {headerBlocks}
                <div className="scrollbar-themed min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
                  {mainBlocks}
                </div>
                {footerBlocks}
              </div>
            );
          })()
        ) : (
          <div className="scrollbar-themed flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-y-auto px-4">
            {children}
          </div>
        )}
      </VaulDrawer.Content>
    </DrawerPortal>
  );
}

const drawerHeaderVariants = cva("relative flex shrink-0 flex-col gap-1.5 pb-4", {
  variants: {
    align: {
      center: "text-center",
      start: "text-left",
    },
  },
  defaultVariants: {
    align: "center",
  },
});

function DrawerHeader({
  className,
  align,
  ...props
}: ComponentProps<"div"> & VariantProps<typeof drawerHeaderVariants>) {
  return <div data-slot="drawer-header" className={cn(drawerHeaderVariants({ align }), className)} {...props} />;
}

const drawerFooterVariants = cva("flex shrink-0 flex-col gap-2", {
  variants: {
    layout: {
      default: "mt-6",
      sticky: "mt-0 border-t border-border bg-popover pt-4 pb-0",
    },
  },
  defaultVariants: {
    layout: "default",
  },
});

function DrawerFooter({
  className,
  layout,
  ...props
}: ComponentProps<"div"> & VariantProps<typeof drawerFooterVariants>) {
  return <div data-slot="drawer-footer" className={cn(drawerFooterVariants({ layout }), className)} {...props} />;
}

const drawerBodyVariants = cva("", {
  variants: {
    spacing: {
      default: "space-y-3 pb-2",
      form: "space-y-4 pb-2",
    },
  },
  defaultVariants: {
    spacing: "default",
  },
});

function DrawerBody({ className, spacing, ...props }: ComponentProps<"div"> & VariantProps<typeof drawerBodyVariants>) {
  return <div data-slot="drawer-body" className={cn(drawerBodyVariants({ spacing }), className)} {...props} />;
}

function DrawerTitle({ className, ...props }: ComponentProps<typeof VaulDrawer.Title>) {
  return (
    <VaulDrawer.Title
      data-slot="drawer-title"
      className={cn("font-heading text-base font-medium leading-none", className)}
      {...props}
    />
  );
}

function DrawerDescription({ className, ...props }: ComponentProps<typeof VaulDrawer.Description>) {
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
  DrawerBody,
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
