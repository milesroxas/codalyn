import { Sparkles } from "lucide-react";
import { getTowerAuthBaseUrl, openTowerAuthPopup } from "@/features/auth/model/tower-auth-client";
import { useBeaconTowerSession } from "@/features/auth/model/use-beacon-tower-session";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export function SettingsAccountPanel() {
  const { user, isPending } = useBeaconTowerSession();
  const base = getTowerAuthBaseUrl();

  if (isPending) {
    return <p className="text-muted-foreground text-sm">Checking account…</p>;
  }

  if (!user) {
    if (!base) {
      return (
        <p className="text-muted-foreground text-sm">
          Tower is not configured. Add <span className="font-mono">VITE_TOWER_ORIGIN</span> to connect an account.
        </p>
      );
    }

    return (
      <Card className="border-dashed">
        <CardHeader className="gap-1 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Sparkles aria-hidden className="size-4 text-primary" />
            Tower account
          </CardTitle>
          <CardDescription>
            Sign in or create an account to sync presets and preferences across devices. Until then, settings stay in
            this browser only.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 pt-0">
          <Button type="button" className="w-full" onClick={() => openTowerAuthPopup("/sign-in")}>
            Sign in to Tower
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={() => openTowerAuthPopup("/sign-up")}>
            Create Tower account
          </Button>
        </CardContent>
      </Card>
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
