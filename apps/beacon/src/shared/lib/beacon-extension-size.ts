/** Designer panel size used across Beacon (home, images, etc.). */
export const BEACON_EXTENSION_SIZE = { width: 350, height: 800 } as const;

export function applyBeaconExtensionSize(): void {
  if (typeof webflow?.setExtensionSize !== "function") return;
  void webflow.setExtensionSize({ ...BEACON_EXTENSION_SIZE });
}
