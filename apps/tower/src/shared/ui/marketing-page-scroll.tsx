"use client";

import { ReactLenis, useLenis } from "lenis/react";
import "lenis/dist/lenis.css";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { cn } from "@/shared/lib/utils";

const PAGE_EXIT_MS = 280;
const PAGE_ENTER_MS = 520;

type TransitionPhase = "idle" | "exiting" | "entering";

function usePrefersReducedMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return reduceMotion;
}

function MarketingPageLenis({ enabled }: { enabled: boolean }) {
  if (!enabled) {
    return null;
  }

  return <ReactLenis root options={{ autoRaf: true, lerp: 0.085, wheelMultiplier: 0.9 }} />;
}

function MarketingPageScrollReset({ phase }: { phase: TransitionPhase }) {
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

export function MarketingPageScroll({ children }: { children: ReactNode }) {
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

      enterTimer = window.setTimeout(() => setPhase("idle"), PAGE_ENTER_MS);
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
      enterTimer = window.setTimeout(() => setPhase("idle"), PAGE_ENTER_MS);
    }, PAGE_EXIT_MS);

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
      <MarketingPageLenis enabled={!reduceMotion} />
      <MarketingPageScrollReset phase={phase} />
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
