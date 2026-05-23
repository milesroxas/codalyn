const BEACON_PRESET_V2_READ_FLAG_KEY = "beaconPresetV2Read";
const BEACON_PRESET_V2_APPLY_FLAG_KEY = "beaconPresetV2Apply";
const BEACON_PRESET_V2_PICKER_FLAG_KEY = "beaconPresetV2Picker";
const BEACON_PRESET_V2_ENFORCE_FLAG_KEY = "beaconPresetV2Enforce";
const BEACON_PRESET_V2_NATURAL_ADVISORY_FLAG_KEY = "beaconPresetV2NaturalAdvisory";

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

export function readBeaconPresetV2ApplyEnabled(): boolean {
  try {
    const raw = localStorage.getItem(BEACON_PRESET_V2_APPLY_FLAG_KEY);
    if (raw == null) {
      return true;
    }
    const normalized = raw.trim().toLowerCase();
    return normalized !== "0" && normalized !== "false";
  } catch {
    return true;
  }
}

export function readBeaconPresetV2PickerEnabled(): boolean {
  try {
    const raw = localStorage.getItem(BEACON_PRESET_V2_PICKER_FLAG_KEY);
    if (raw == null) {
      return true;
    }
    const normalized = raw.trim().toLowerCase();
    return normalized !== "0" && normalized !== "false";
  } catch {
    return true;
  }
}

export function readBeaconPresetV2EnforceEnabled(): boolean {
  try {
    const raw = localStorage.getItem(BEACON_PRESET_V2_ENFORCE_FLAG_KEY);
    if (raw == null) {
      return true;
    }
    const normalized = raw.trim().toLowerCase();
    return normalized !== "0" && normalized !== "false";
  } catch {
    return true;
  }
}

export function readBeaconPresetV2NaturalAdvisoryEnabled(): boolean {
  try {
    const raw = localStorage.getItem(BEACON_PRESET_V2_NATURAL_ADVISORY_FLAG_KEY);
    if (raw == null) {
      return true;
    }
    const normalized = raw.trim().toLowerCase();
    return normalized !== "0" && normalized !== "false";
  } catch {
    return true;
  }
}
