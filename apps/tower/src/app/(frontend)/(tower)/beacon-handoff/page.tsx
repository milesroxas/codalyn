"use client";

import { useEffect, useRef } from "react";
import { sanitizeRelativePath } from "@/shared/lib/navigation/sanitize-relative-path";

/**
 * Beacon → Tower session handoff landing page.
 *
 * The Designer extension opens this page with the single-use one-time token in the URL
 * **fragment** (`#ott=…&callbackUrl=…`). Fragments are never sent to the server, so the token
 * cannot appear in server, proxy, or CDN access logs (Marketplace round-6 requirement — no auth
 * tokens in query strings). The page:
 *
 * 1. reads the fragment and immediately strips it from the address bar / history entry,
 * 2. redeems the token via `POST /api/beacon-handoff` (JSON body; sets the session cookie),
 * 3. navigates to the sanitized same-origin `callbackUrl`.
 *
 * Redemption failures still navigate — the destination enforces its own auth and bounces to
 * `/sign-in` when no session cookie was established.
 */
export default function BeaconHandoffPage() {
  const startedRef = useRef(false);

  useEffect(() => {
    // One-time tokens are consumed on first redemption; React StrictMode double-invokes effects in dev.
    if (startedRef.current) {
      return;
    }
    startedRef.current = true;

    const rawHash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
    const params = new URLSearchParams(rawHash);
    const token = params.get("ott")?.trim() ?? "";
    const callbackUrl = sanitizeRelativePath(params.get("callbackUrl") ?? "/");

    // Drop the token-bearing fragment before any network work so it survives in neither the
    // address bar nor this history entry.
    window.history.replaceState(null, "", window.location.pathname);

    if (!token) {
      window.location.replace(callbackUrl);
      return;
    }

    void fetch("/api/beacon-handoff", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .catch(() => null)
      .finally(() => {
        window.location.replace(callbackUrl);
      });
  }, []);

  return (
    <main className="p-6 text-center text-sm text-neutral-600">
      <p>Signing you in…</p>
    </main>
  );
}
