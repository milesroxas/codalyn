/** Designer panel size used across Beacon (home, images, etc.). */
export const BEACON_EXTENSION_SIZE = { width: 440, height: 880 } as const;

export function applyBeaconExtensionSize(): void {
  if (typeof webflow?.setExtensionSize !== "function") return;
  void webflow.setExtensionSize({ ...BEACON_EXTENSION_SIZE });
}
