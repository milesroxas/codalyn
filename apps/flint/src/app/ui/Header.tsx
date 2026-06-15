import { Cloud, CloudOff, Settings, UserRound } from "lucide-react";
import { useFlintTower } from "@/features/auth/model/flint-tower-provider";
import { useExpandedView } from "@/features/linter/store/expandedView.store";
import HeightSwitcher from "@/features/window/components/HeightSwitcher";
import { Button } from "@/shared/ui/button";

/** Account/sync entry. Hidden entirely when Tower is not configured, so the free/offline UI is unchanged. */
function HeaderAccountButton() {
  const { isTowerConfigured, user, syncStatus } = useFlintTower();
  const { openExpandedView } = useExpandedView();

  if (!isTowerConfigured) {
    return null;
  }

  const Icon = user ? UserRound : syncStatus === "offline" ? CloudOff : Cloud;
  const label = user ? "Account & sync" : "Sign in to Tower";

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => openExpandedView({ type: "account-sync", title: "Account & sync" })}
      aria-label={label}
    >
      <Icon className="h-3.5 w-3.5" />
    </Button>
  );
}

export default function Header() {
  const { openExpandedView } = useExpandedView();

  return (
    <div className="relative flex flex-row items-center justify-between px-2 py-1 m-0 bg-muted text-foreground">
      <HeightSwitcher />
      <h1 className="text-lg font-medium leading-widest absolute left-1/2 -translate-x-1/2">
        <img src="./images/flint-app-logo-light.svg" alt="Flint" className="h-4 w-auto dark:hidden" />
        <img src="./images/flint-app-logo-dark.svg" alt="Flint" className="h-4 w-auto hidden dark:block" />
      </h1>
      <div className="flex flex-row items-center gap-0.5">
        <HeaderAccountButton />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => openExpandedView({ type: "settings", title: "Settings" })}
          aria-label="Open settings"
        >
          <Settings className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
