"use client";

import { useSyncExternalStore } from "react";
import {
  resolveTowerPostSignOutUrl,
  resolveTowerSignOutNavigationHref,
} from "@/shared/lib/navigation/resolve-tower-post-sign-out-url";
import { TOWER_PUBLIC_PAGE_EXIT_MS } from "@/shared/ui/tower-public-page-scroll";

/** Matches public page route exit timing (`TowerPublicPageScroll`). */
export const TOWER_SIGN_OUT_EXIT_MS = TOWER_PUBLIC_PAGE_EXIT_MS;

let signingOut = false;
const listeners = new Set<() => void>();

function emitSignOutTransitionChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function setTowerSignOutTransition(active: boolean): void {
  if (signingOut === active) {
    return;
  }
  signingOut = active;
  emitSignOutTransitionChange();
}

export function readTowerSignOutTransition(): boolean {
  return signingOut;
}

export function useTowerSignOutTransition(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    readTowerSignOutTransition,
    () => false
  );
}

export function waitForTowerSignOutExitTransition(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    window.setTimeout(resolve, TOWER_SIGN_OUT_EXIT_MS);
  });
}

export async function completeTowerWebSignOutNavigation(): Promise<void> {
  const destination = resolveTowerPostSignOutUrl();
  await waitForTowerSignOutExitTransition();
  const href = resolveTowerSignOutNavigationHref(destination, window.location.origin);
  window.location.replace(href);
}
