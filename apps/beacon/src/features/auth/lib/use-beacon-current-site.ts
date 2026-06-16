import { useEffect, useState } from "react";

export type BeaconCurrentSite = { siteId: string; siteName: string; shortName: string };

/**
 * The Webflow site currently open in the Designer, resolved once via `webflow.getSiteInfo()` and cached
 * across hook instances. `ready` flips true after the first resolution attempt (site stays null if the
 * Designer API call fails). Provides the site name/shortName — values Tower can't get for sites outside
 * the Data API OAuth grant.
 */
let cachedSite: BeaconCurrentSite | null = null;
let inflight: Promise<BeaconCurrentSite | null> | null = null;

async function loadCurrentSite(): Promise<BeaconCurrentSite | null> {
  try {
    const info = await webflow.getSiteInfo();
    const siteId = typeof info?.siteId === "string" ? info.siteId.trim() : "";
    if (!siteId) {
      return null;
    }
    return {
      siteId,
      siteName: typeof info.siteName === "string" ? info.siteName : "",
      shortName: typeof info.shortName === "string" ? info.shortName : "",
    };
  } catch {
    return null;
  }
}

export function useBeaconCurrentSite(): { site: BeaconCurrentSite | null; ready: boolean } {
  const [site, setSite] = useState<BeaconCurrentSite | null>(cachedSite);
  const [ready, setReady] = useState<boolean>(cachedSite !== null);

  useEffect(() => {
    if (cachedSite) {
      return;
    }
    let cancelled = false;
    inflight ??= loadCurrentSite();
    void inflight.then((resolved) => {
      if (resolved) {
        cachedSite = resolved;
      }
      if (!cancelled) {
        setSite(resolved);
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { site, ready };
}
