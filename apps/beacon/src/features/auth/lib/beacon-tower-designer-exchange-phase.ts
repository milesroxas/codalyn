export type BeaconTowerDesignerExchangePhase = "idle" | "running" | "settled";

let phase: BeaconTowerDesignerExchangePhase = "idle";
const listeners = new Set<() => void>();

export function readBeaconTowerDesignerExchangePhase(): BeaconTowerDesignerExchangePhase {
  return phase;
}

export function setBeaconTowerDesignerExchangePhase(next: BeaconTowerDesignerExchangePhase): void {
  if (phase === next) {
    return;
  }
  phase = next;
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeBeaconTowerDesignerExchangePhase(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
