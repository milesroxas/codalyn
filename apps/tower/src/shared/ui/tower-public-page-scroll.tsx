"use client";

import { useLenis } from "lenis/react";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { usePrefersReducedMotion } from "@/shared/lib/use-prefers-reduced-motion";
import { cn } from "@/shared/lib/utils";
import { TowerLenisRoot } from "@/shared/ui/tower-lenis-root";

/** Public page route transition — keep in sync with sign-out exit timing. */
export const TOWER_PUBLIC_PAGE_EXIT_MS = 280;
export const TOWER_PUBLIC_PAGE_ENTER_MS = 520;

type TransitionPhase = "idle" | "exiting" | "entering";

function TowerPublicPageScrollReset({ phase }: { phase: TransitionPhase }) {
  const lenis = useLenis();

  useEffect(() => {
    if (phase !== "entering") {
      return;
    }

    if (lenis) {
      lenis.scrollTo(0, { immediate: true });
      return;
    }

    window.scrollTo(0, 0);
  }, [lenis, phase]);

  return null;
}

type TowerPublicPageScrollProps = {
  children: ReactNode;
};

function TowerPublicPageScroll({ children }: TowerPublicPageScrollProps) {
  const pathname = usePathname();
  const reduceMotion = usePrefersReducedMotion();
  const [phase, setPhase] = useState<TransitionPhase>("entering");
  const frozenContent = useRef(children);
  const frozenPath = useRef(pathname);
  const isInitialMount = useRef(true);

  useEffect(() => {
    let enterTimer: number | undefined;

    if (isInitialMount.current) {
      isInitialMount.current = false;
      frozenContent.current = children;
      frozenPath.current = pathname;

      if (reduceMotion) {
        setPhase("idle");
        return;
      }

      enterTimer = window.setTimeout(() => setPhase("idle"), TOWER_PUBLIC_PAGE_ENTER_MS);
      return () => {
        if (enterTimer !== undefined) {
          window.clearTimeout(enterTimer);
        }
      };
    }

    if (pathname === frozenPath.current) {
      frozenContent.current = children;
      return;
    }

    if (reduceMotion) {
      frozenContent.current = children;
      frozenPath.current = pathname;
      setPhase("idle");
      window.scrollTo(0, 0);
      return;
    }

    setPhase("exiting");
    const exitTimer = window.setTimeout(() => {
      frozenContent.current = children;
      frozenPath.current = pathname;
      setPhase("entering");
      enterTimer = window.setTimeout(() => setPhase("idle"), TOWER_PUBLIC_PAGE_ENTER_MS);
    }, TOWER_PUBLIC_PAGE_EXIT_MS);

    return () => {
      window.clearTimeout(exitTimer);
      if (enterTimer !== undefined) {
        window.clearTimeout(enterTimer);
      }
    };
  }, [children, pathname, reduceMotion]);

  const displayContent = phase === "exiting" ? frozenContent.current : children;
  const contentKey = phase === "exiting" ? frozenPath.current : pathname;

  return (
    <>
      <TowerLenisRoot enabled={!reduceMotion} />
      <TowerPublicPageScrollReset phase={phase} />
      <div
        key={contentKey}
        className={cn(
          phase === "exiting" && "tl-marketing-page-transition--exit",
          phase === "entering" && "tl-marketing-page-transition--enter"
        )}
      >
        {displayContent}
      </div>
    </>
  );
}

export { TowerPublicPageScroll };
