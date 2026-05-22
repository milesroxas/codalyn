const BEACON_PRESET_V2_READ_FLAG_KEY = "beaconPresetV2Read";

export function readBeaconPresetV2ReadEnabled(): boolean {
  try {
    const raw = localStorage.getItem(BEACON_PRESET_V2_READ_FLAG_KEY);
    if (raw == null) {
      return true;
    }
    const normalized = raw.trim().toLowerCase();
    return normalized !== "0" && normalized !== "false";
  } catch {
    return true;
  }
}
