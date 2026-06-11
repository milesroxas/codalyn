"use client";

import { ReactLenis } from "lenis/react";
import "lenis/dist/lenis.css";

/** Single Lenis configuration for public Codalyn marketing surfaces. */
export const TOWER_LENIS_OPTIONS = {
  autoRaf: true,
  lerp: 0.085,
  wheelMultiplier: 0.9,
} as const;

type TowerLenisRootProps = {
  enabled: boolean;
};

function TowerLenisRoot({ enabled }: TowerLenisRootProps) {
  if (!enabled) {
    return null;
  }

  return <ReactLenis root options={TOWER_LENIS_OPTIONS} />;
}

export { TowerLenisRoot };
