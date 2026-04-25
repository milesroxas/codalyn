"use client";

import { useEffect, useState } from "react";
import { cn } from "@/shared/lib/utils";

/** After veil (~720ms) + graphic fade (~900ms) + copy stagger — unlock CTAs once motion has settled. */
/** After feature cards finish fading in (last delay + duration). 4150ms + 750ms + buffer */
const INTRO_INTERACTIVE_MS = 5000;
const INTRO_LAYOUT_KICK_AFTER_VEIL_MS = 740;

export function TowerLandingEntrance({ children }: { children: React.ReactNode }) {
  const [interactive, setInteractive] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setInteractive(true);
      queueMicrotask(() => window.dispatchEvent(new Event("resize")));
      return;
    }
    const kickLayout = () => window.dispatchEvent(new Event("resize"));
    const idKick = window.setTimeout(kickLayout, INTRO_LAYOUT_KICK_AFTER_VEIL_MS);
    const idInteractive = window.setTimeout(() => {
      setInteractive(true);
      kickLayout();
    }, INTRO_INTERACTIVE_MS);
    return () => {
      window.clearTimeout(idKick);
      window.clearTimeout(idInteractive);
    };
  }, []);

  return (
    <div className={cn("relative min-h-dvh w-full min-w-0", !interactive && "pointer-events-none")}>
      <div
        aria-hidden
        className={cn("tl-landing-veil fixed inset-0 z-20 bg-background", interactive && "tl-landing-veil--skip")}
      />
      {children}
    </div>
  );
}
