const STORAGE_KEY = "beacon.guestWelcome.v1";

export function readBeaconGuestWelcomeComplete(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeBeaconGuestWelcomeComplete(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // ignore quota / private mode
  }
}
