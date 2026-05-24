export type BeaconSettingsSyncState = "idle" | "loading" | "synced" | "error";

export function isBeaconTowerSettingsPullPending(isTowerUser: boolean, syncState: BeaconSettingsSyncState): boolean {
  return isTowerUser && (syncState === "idle" || syncState === "loading");
}

/** Tower settings pull succeeded; role flags and workspace context are authoritative. */
export function isBeaconTowerSettingsSynced(isTowerUser: boolean, syncState: BeaconSettingsSyncState): boolean {
  return !isTowerUser || syncState === "synced";
}

/** Pull finished (success or failure); UI may proceed with local settings. */
export function isBeaconTowerSettingsPullSettled(isTowerUser: boolean, syncState: BeaconSettingsSyncState): boolean {
  return !isTowerUser || syncState === "synced" || syncState === "error";
}
