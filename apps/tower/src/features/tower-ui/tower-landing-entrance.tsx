"use client";

import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/shared/lib/use-prefers-reduced-motion";
import { cn } from "@/shared/lib/utils";
import { TowerLenisRoot } from "@/shared/ui/tower-lenis-root";

/** After feature cards finish fading in (last delay + duration). 4150ms + 750ms + buffer */
const INTRO_INTERACTIVE_MS = 5000;
/** Matches `.tl-landing-veil` animation duration — release overlay without a layout kick. */
const INTRO_VEIL_MS = 720;
const INTRO_LAYOUT_KICK_AFTER_VEIL_MS = 740;

export function TowerLandingEntrance({ children, main }: { children: React.ReactNode; main: React.ReactNode }) {
  const reduceMotion = usePrefersReducedMotion();
  const [interactive, setInteractive] = useState(false);
  const [veilDone, setVeilDone] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setInteractive(true);
      setVeilDone(true);
      queueMicrotask(() => window.dispatchEvent(new Event("resize")));
      return;
    }
    const kickLayout = () => {
      window.dispatchEvent(new Event("resize"));
    };
    const idVeil = window.setTimeout(() => {
      setVeilDone(true);
    }, INTRO_VEIL_MS);
    const idKick = window.setTimeout(kickLayout, INTRO_LAYOUT_KICK_AFTER_VEIL_MS);
    const idInteractive = window.setTimeout(() => {
      setInteractive(true);
    }, INTRO_INTERACTIVE_MS);
    return () => {
      window.clearTimeout(idVeil);
      window.clearTimeout(idKick);
      window.clearTimeout(idInteractive);
    };
  }, []);

  return (
    <div className="relative w-full min-w-0 min-h-dvh overflow-x-clip lg:h-dvh lg:overflow-hidden">
      <TowerLenisRoot enabled={!reduceMotion} />
      <div
        aria-hidden
        className={cn("tl-landing-veil fixed inset-0 z-20 bg-background", veilDone && "tl-landing-veil--skip")}
      />
      {children}
      <div className={cn(!interactive && "pointer-events-none")}>{main}</div>
    </div>
  );
}
