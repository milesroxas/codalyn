/** Strings for the footer page-script sync strip (Engine, Composition, Home). */
export type BeaconEmbedSyncStripCopy = {
  loading: string;
  synced: string;
  unsyncedFallback: string;
};

export const BEACON_EMBED_SYNC_STRIP_DEFAULT_COPY: BeaconEmbedSyncStripCopy = {
  loading: "Checking…",
  synced: "Footer JS OK · publish for live.",
  unsyncedFallback: "Footer script missing or outdated.",
};
