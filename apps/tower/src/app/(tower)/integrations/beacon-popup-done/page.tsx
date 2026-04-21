"use client";

import { useEffect } from "react";

/** Popup target when Tower session exists and Webflow OAuth is already stored — close without re-consent. */
export default function BeaconPopupDonePage() {
  useEffect(() => {
    window.close();
  }, []);

  return (
    <main className="p-6 text-center text-sm text-neutral-600">
      <p>Signed in. You can close this window.</p>
    </main>
  );
}
