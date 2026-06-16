// In-memory record that the user explicitly chose to continue as a guest.
//
// Intentionally NOT persisted (no localStorage/sessionStorage): the Webflow Designer is a
// long-lived browser tab, and sessionStorage would survive a Designer refresh / panel reopen,
// keeping a guest pinned to home. Keeping the choice in module memory means every fresh load of
// the extension starts from a clean slate — a logged-out user sees the login gate again, and the
// choice only suppresses it for the current app load. It is never set automatically on sign-in;
// auth state alone hides the gate while signed in.
let guestChosen = false;
const listeners = new Set<() => void>();

function notifyGuestChosenChanged(): void {
  for (const listener of listeners) {
    listener();
  }
}

/** Subscribe to guest-choice changes so the welcome gate can re-show when sign-in is requested elsewhere. */
export function subscribeBeaconGuestChosen(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function readBeaconGuestChosen(): boolean {
  return guestChosen;
}

export function writeBeaconGuestChosen(): void {
  if (guestChosen) {
    return;
  }
  guestChosen = true;
  notifyGuestChosenChanged();
}

export function clearBeaconGuestChosen(): void {
  if (!guestChosen) {
    return;
  }
  guestChosen = false;
  notifyGuestChosenChanged();
}
