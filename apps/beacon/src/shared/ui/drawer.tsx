import { cva, type VariantProps } from "class-variance-authority";
import { XIcon } from "lucide-react";
import {
  Children,
  type ComponentProps,
  createContext,
  isValidElement,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useReducer,
  useState,
} from "react";
import { Drawer as VaulDrawer } from "vaul";

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

/** Stacked-top sheets use 2.5rem shorter heights so the sheet behind remains visible. */
const DRAWER_BASE_Z_INDEX = 50;

type DrawerStackState = {
  drawerId: string;
  stackIndex: number;
  totalOpen: number;
  isTopmost: boolean;
  isStackedTop: boolean;
  /** Vaul `NestedRoot` handles parent scale/offset; skip manual stacked-top height. */
  useNativeNestedStacking: boolean;
};

const defaultDrawerStackState: DrawerStackState = {
  drawerId: "",
  stackIndex: 0,
  totalOpen: 0,
  isTopmost: true,
  isStackedTop: false,
  useNativeNestedStacking: false,
};

const DrawerStackContext = createContext<DrawerStackState>(defaultDrawerStackState);

let openDrawerOrder: string[] = [];
const drawerStackListeners = new Set<() => void>();

function notifyDrawerStackListeners() {
  for (const listener of drawerStackListeners) {
    listener();
  }
}

function registerOpenDrawer(id: string) {
  if (openDrawerOrder.includes(id)) {
    return;
  }
  openDrawerOrder = [...openDrawerOrder, id];
  notifyDrawerStackListeners();
}

function unregisterOpenDrawer(id: string) {
  if (!openDrawerOrder.includes(id)) {
    return;
  }
  openDrawerOrder = openDrawerOrder.filter((entry) => entry !== id);
  notifyDrawerStackListeners();
}

function getDrawerStackState(id: string): DrawerStackState {
  const stackIndex = openDrawerOrder.indexOf(id);
  const totalOpen = openDrawerOrder.length;
  const isTopmost = stackIndex >= 0 && stackIndex === totalOpen - 1;

  return {
    drawerId: id,
    stackIndex: stackIndex >= 0 ? stackIndex : 0,
    totalOpen,
    isTopmost,
    isStackedTop: totalOpen > 1 && isTopmost,
    useNativeNestedStacking: false,
  };
}

// Vaul keeps a closed drawer's content mounted until its exit animation finishes (Radix
// presence). Mounted-but-logically-closed is the window where opening another modal drawer races
// its scroll-lock teardown; consumers can wait it out via the registry below instead of polling
// the DOM.
const mountedDrawerContentIds = new Set<string>();

function syncDrawerContentMounted(id: string, mounted: boolean) {
  if (!id) {
    return;
  }
  if (mounted) {
    mountedDrawerContentIds.add(id);
  } else {
    mountedDrawerContentIds.delete(id);
  }
  notifyDrawerStackListeners();
}

/** True while any drawer's content is still mounted (exit animation running) after logical close. */
function hasDrawerMidClose(): boolean {
  for (const id of mountedDrawerContentIds) {
    if (!openDrawerOrder.includes(id)) {
      return true;
    }
  }
  return false;
}

/** Notifies on any drawer open/close/mount/unmount transition. Returns the unsubscribe. */
function subscribeDrawerStack(listener: () => void): () => void {
  drawerStackListeners.add(listener);
  return () => {
    drawerStackListeners.delete(listener);
  };
}

function syncDrawerStackMembership(id: string, open: boolean) {
  if (open) {
    registerOpenDrawer(id);
    return;
  }
  unregisterOpenDrawer(id);
}

// vaul wraps Radix Dialog, which locks background interaction by setting `pointer-events: none`
// on <body>. When one drawer opens while another is mid-close, Radix's open/close races leave the
// lock stuck — killing scroll and portaled Select dropdowns inside the freshly opened sheet
// ("dead" sheet). Our DrawerOverlay (fixed inset-0) already blocks the background, so <body> never
// needs the lock: while any drawer is open we observe <body> and immediately revert a stuck `none`.
//
// Scope note (Marketplace review): this guard reverts a style the bundled library itself wrote —
// it introduces no styling of its own and cannot execute markup. It stays inside the extension's
// own iframe document, exists only while a drawer is open (refcounted acquire/release below,
// disconnected on the last close), and a static CSS rule cannot express "revert the lock only
// when it is stuck" without also defeating the legitimate lock other Radix modals rely on.
let bodyPointerEventsGuardCount = 0;
let bodyPointerEventsObserver: MutationObserver | null = null;

function clearStuckBodyPointerEvents() {
  if (document.body.style.pointerEvents === "none") {
    document.body.style.pointerEvents = "";
  }
}

function acquireBodyPointerEventsGuard() {
  bodyPointerEventsGuardCount += 1;
  if (bodyPointerEventsObserver != null) {
    return;
  }
  clearStuckBodyPointerEvents();
  bodyPointerEventsObserver = new MutationObserver(clearStuckBodyPointerEvents);
  bodyPointerEventsObserver.observe(document.body, { attributes: true, attributeFilter: ["style"] });
}

function releaseBodyPointerEventsGuard() {
  bodyPointerEventsGuardCount = Math.max(0, bodyPointerEventsGuardCount - 1);
  if (bodyPointerEventsGuardCount > 0) {
    return;
  }
  bodyPointerEventsObserver?.disconnect();
  bodyPointerEventsObserver = null;
  clearStuckBodyPointerEvents();
}

function useClearStuckBodyPointerEvents(open: boolean) {
  useEffect(() => {
    if (!open) {
      return;
    }
    acquireBodyPointerEventsGuard();
    return releaseBodyPointerEventsGuard;
  }, [open]);
}

function useDrawerStackState(id: string, open: boolean): DrawerStackState {
  const [, rerender] = useReducer((count: number) => count + 1, 0);

  useEffect(() => {
    const listener = () => {
      rerender();
    };
    drawerStackListeners.add(listener);
    return () => {
      drawerStackListeners.delete(listener);
    };
  }, []);

  useLayoutEffect(() => {
    syncDrawerStackMembership(id, open);
    return () => {
      unregisterOpenDrawer(id);
    };
  }, [id, open]);

  return getDrawerStackState(id);
}

type DrawerProps = ComponentProps<typeof VaulDrawer.Root> & {
  /** When true, backdrop swipe/click and dismiss gestures cannot close the drawer. */
  interactionBlocked?: boolean;
};

function Drawer(props: DrawerProps) {
  const {
    interactionBlocked = false,
    dismissible = true,
    onOpenChange,
    open: openProp,
    defaultOpen = false,
    ...rest
  } = props;
  const drawerId = useId();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = openProp ?? uncontrolledOpen;
  const stackState = useDrawerStackState(drawerId, open);
  useClearStuckBodyPointerEvents(open);
  const effectiveDismissible = dismissible && !interactionBlocked;

  return (
    <DrawerStackContext.Provider value={stackState}>
      <VaulDrawer.Root
        data-slot="drawer"
        repositionInputs={false}
        dismissible={effectiveDismissible}
        open={openProp}
        defaultOpen={defaultOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && interactionBlocked) {
            return;
          }
          syncDrawerStackMembership(drawerId, nextOpen);
          if (openProp === undefined) {
            setUncontrolledOpen(nextOpen);
          }
          onOpenChange?.(nextOpen);
        }}
        {...rest}
      />
    </DrawerStackContext.Provider>
  );
}

function DrawerNested(props: DrawerProps) {
  const {
    interactionBlocked = false,
    dismissible = true,
    onOpenChange,
    open: openProp,
    defaultOpen = false,
    ...rest
  } = props;
  const drawerId = useId();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = openProp ?? uncontrolledOpen;
  const stackState = useDrawerStackState(drawerId, open);
  useClearStuckBodyPointerEvents(open);
  const effectiveDismissible = dismissible && !interactionBlocked;

  return (
    <DrawerStackContext.Provider value={{ ...stackState, useNativeNestedStacking: true }}>
      <VaulDrawer.NestedRoot
        data-slot="drawer"
        repositionInputs={false}
        dismissible={effectiveDismissible}
        open={openProp}
        defaultOpen={defaultOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && interactionBlocked) {
            return;
          }
          syncDrawerStackMembership(drawerId, nextOpen);
          if (openProp === undefined) {
            setUncontrolledOpen(nextOpen);
          }
          onOpenChange?.(nextOpen);
        }}
        {...rest}
      />
    </DrawerStackContext.Provider>
  );
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

function DrawerOverlay({ className, style, ...props }: ComponentProps<typeof VaulDrawer.Overlay>) {
  const { stackIndex, totalOpen } = useContext(DrawerStackContext);
  const ownsStackBackdrop = stackIndex === 0;

  // Only the bottom-most drawer renders a backdrop. Stacked sheets above it stay overlay-free
  // so closing the top sheet never leaves a lingering blur over the sheet behind.
  if (totalOpen > 1 && !ownsStackBackdrop) {
    return null;
  }

  return (
    <VaulDrawer.Overlay
      data-slot="drawer-overlay"
      style={{ zIndex: DRAWER_BASE_Z_INDEX + stackIndex, ...style }}
      className={cn(
        "fixed inset-0 isolate bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
        className
      )}
      {...props}
    />
  );
}

const drawerContentVariants = cva(
  // Bottom-sheet top corners pinned to 6px (pre-radius-tighten value); intentionally exempt from the reduced scale.
  "fixed inset-x-0 bottom-0 flex min-h-0 flex-col rounded-t-[0.375rem] border-x border-t border-border bg-popover pb-[max(1rem,env(safe-area-inset-bottom))] ring-1 ring-foreground/10 outline-none duration-200",
  {
    variants: {
      maxHeight: {
        default: "max-h-[min(95vh,600px)]",
        tall: "h-[90vh] max-h-[95vh]",
      },
      stackedTop: {
        false: "",
        true: "",
      },
    },
    compoundVariants: [
      {
        maxHeight: "default",
        stackedTop: true,
        class: "max-h-[min(calc(95vh-2.5rem),calc(600px-2.5rem))]",
      },
      {
        maxHeight: "tall",
        stackedTop: true,
        class: "h-[calc(90vh-2.5rem)] max-h-[calc(95vh-2.5rem)]",
      },
    ],
    defaultVariants: {
      maxHeight: "default",
      stackedTop: false,
    },
  }
);

type DrawerStickySections = {
  headerBlocks: ReactNode[];
  mainBlocks: ReactNode[];
  footerBlocks: ReactNode[];
};

function splitDrawerStickySections(children: ReactNode): DrawerStickySections {
  const headerBlocks: ReactNode[] = [];
  const footerBlocks: ReactNode[] = [];
  const mainBlocks: ReactNode[] = [];

  for (const node of Children.toArray(children)) {
    if (isValidElement(node) && node.type === DrawerFooter) {
      footerBlocks.push(node);
    } else if (isValidElement(node) && node.type === DrawerHeader) {
      headerBlocks.push(node);
    } else {
      mainBlocks.push(node);
    }
  }

  return { headerBlocks, mainBlocks, footerBlocks };
}

function DrawerStickyFooterLayout(props: { children: ReactNode; stickyMainScroll: boolean }) {
  const { children, stickyMainScroll } = props;
  const { headerBlocks, mainBlocks, footerBlocks } = splitDrawerStickySections(children);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-visible">
      {headerBlocks}
      <div
        className={cn(
          "min-h-0 min-w-0 flex-1",
          stickyMainScroll ? "scrollbar-themed overflow-x-hidden overflow-y-auto px-4" : "flex flex-col overflow-hidden"
        )}
      >
        {mainBlocks}
      </div>
      {footerBlocks}
    </div>
  );
}

function DrawerContent({
  className,
  children,
  showCloseButton = true,
  showDragHandle = true,
  stickyFooter = false,
  stickyMainScroll = true,
  flushBottom = false,
  maxHeight,
  style,
  ...props
}: ComponentProps<typeof VaulDrawer.Content> &
  VariantProps<typeof drawerContentVariants> & {
    showCloseButton?: boolean;
    showDragHandle?: boolean;
    /** When true, `DrawerHeader` and `DrawerFooter` stay fixed; other children scroll in between. */
    stickyFooter?: boolean;
    /** When false with `stickyFooter`, the main slot does not scroll; use a nested `ScrollArea` instead. */
    stickyMainScroll?: boolean;
    /**
     * Drops the content's bottom inset so a child that owns its own footer (e.g. a route chrome) sits flush with
     * the drawer edge. The child footer is responsible for its own safe-area padding.
     */
    flushBottom?: boolean;
  }) {
  const { drawerId, isStackedTop, stackIndex, useNativeNestedStacking } = useContext(DrawerStackContext);
  const stackedTop = isStackedTop && !useNativeNestedStacking;

  // Mounted-content registry feed for hasDrawerMidClose(); vaul unmounts this node only after the
  // exit animation completes, so the unregister marks "the drawer has fully left".
  useEffect(() => {
    syncDrawerContentMounted(drawerId, true);
    return () => {
      syncDrawerContentMounted(drawerId, false);
    };
  }, [drawerId]);
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
        style={{ zIndex: DRAWER_BASE_Z_INDEX + stackIndex, ...style }}
        className={cn(drawerContentVariants({ maxHeight, stackedTop }), flushBottom && "pb-0", className)}
        {...props}
      >
        {showDragHandle && showCloseButton ? (
          <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-x-2 px-4 pt-2 pb-1.5">
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
            className="mx-auto mt-2 mb-2.5 h-1 w-11 shrink-0 rounded-full bg-muted-foreground/30"
          />
        ) : showCloseButton ? (
          <div className="flex shrink-0 justify-end px-4 pt-1.5 pb-1.5">{closeControl}</div>
        ) : (
          <div className="mt-1 shrink-0" aria-hidden />
        )}
        {stickyFooter ? (
          <DrawerStickyFooterLayout stickyMainScroll={stickyMainScroll}>{children}</DrawerStickyFooterLayout>
        ) : (
          <div className="scrollbar-themed flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-y-auto px-4">
            {children}
          </div>
        )}
      </VaulDrawer.Content>
    </DrawerPortal>
  );
}

const drawerHeaderVariants = cva("relative flex shrink-0 flex-col gap-1 overflow-visible px-4 pb-2", {
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

const drawerFooterVariants = cva("flex shrink-0 gap-2 px-4", {
  variants: {
    layout: {
      default: "mt-6",
      sticky: "mt-0 border-t border-border bg-popover pt-4 pb-0",
    },
    orientation: {
      vertical: "flex-col",
      horizontal: "flex-row [&>*]:flex-1",
    },
  },
  defaultVariants: {
    layout: "default",
    orientation: "vertical",
  },
});

function DrawerFooter({
  className,
  layout,
  orientation,
  ...props
}: ComponentProps<"div"> & VariantProps<typeof drawerFooterVariants>) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn(drawerFooterVariants({ layout, orientation }), className)}
      {...props}
    />
  );
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

const drawerListSheetContentDefaults = {
  stickyFooter: true,
  stickyMainScroll: false,
  showCloseButton: true,
  maxHeight: "tall",
} as const;

export {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerNested,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
  drawerListSheetContentDefaults,
  hasDrawerMidClose,
  subscribeDrawerStack,
};
