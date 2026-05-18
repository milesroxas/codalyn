/** Shown when `VITE_TOWER_ORIGIN` is unset — shared by account settings, route gates, etc. */
export function BeaconTowerNotConfiguredNotice() {
  return (
    <p className="text-muted-foreground text-sm">
      Tower is not configured. Add <span className="font-mono">VITE_TOWER_ORIGIN</span> to connect an account.
    </p>
  );
}
