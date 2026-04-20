import { getTowerAuthBaseUrl } from "@/features/auth/model/tower-auth-client";
import { useBeaconTowerSession } from "@/features/auth/model/use-beacon-tower-session";
import { Button } from "@/shared/ui/button";

const POPUP = "popup=yes,width=540,height=780,scrollbars=yes,resizable=yes";

export function SettingsAccountPanel() {
  const { user, isPending } = useBeaconTowerSession();
  const base = getTowerAuthBaseUrl();

  if (isPending) {
    return <p className="text-muted-foreground text-sm">Checking account…</p>;
  }

  if (!user) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-muted-foreground text-sm">You are not signed in to Tower.</p>
        {base ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              const origin = encodeURIComponent(window.location.origin);
              window.open(`${base}/sign-in?beaconOrigin=${origin}`, "beacon-tower-auth", POPUP);
            }}
          >
            Sign in to Tower
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <dl className="flex flex-col gap-3 text-sm">
      <div>
        <dt className="text-muted-foreground text-xs">Email</dt>
        <dd className="font-medium break-all">{user.email}</dd>
      </div>
      {user.name ? (
        <div>
          <dt className="text-muted-foreground text-xs">Name</dt>
          <dd className="font-medium">{user.name}</dd>
        </div>
      ) : null}
    </dl>
  );
}
