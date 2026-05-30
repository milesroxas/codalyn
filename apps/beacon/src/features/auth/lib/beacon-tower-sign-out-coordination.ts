/** Guards sign-out side effects when a newer Tower session arrives before sign-out finishes. */
let signOutEpoch = 0;

export function beginBeaconTowerSignOut(): number {
  signOutEpoch += 1;
  return signOutEpoch;
}

/** Invalidates in-flight sign-out token clearing and post-sign-out refetch. */
export function invalidateBeaconTowerSignOut(): void {
  signOutEpoch += 1;
}

export function isBeaconTowerSignOutCurrent(epoch: number): boolean {
  return signOutEpoch === epoch;
}
