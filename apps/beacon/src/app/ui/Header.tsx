import { ChevronDown, ExternalLink, Image as ImageIcon, LogIn, LogOut, Menu, Radio, Settings } from "lucide-react";
import { useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getTowerAuthBaseUrl, isTowerConfigured } from "@/features/auth/model/tower-auth-client";
import { type BridgedTowerUser, useBeaconTowerSession } from "@/features/auth/model/use-beacon-tower-session";
import { isBeaconsSurfaceEnabled } from "@/shared/lib/beacons-surface-enabled";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

const lightLogoSrc = `${import.meta.env.BASE_URL}images/light-logo-beacon.svg`;
const darkLogoSrc = `${import.meta.env.BASE_URL}images/dark-logo-beacon.svg`;

/** Tower sign-in / sign-up (`max-w-sm` form + errors + Sign up link). */
const TOWER_EMAIL_AUTH_POPUP_FEATURES = "popup=yes,width=540,height=780,scrollbars=yes,resizable=yes";

function getAccountLabel(name: string | null | undefined, email: string): string {
  const trimmedName = name?.trim();
  return trimmedName && trimmedName.length > 0 ? trimmedName : email;
}

function getAccountInitials(label: string): string {
  const parts = label
    .trim()
    .split(/[\s@._-]+/)
    .filter(Boolean);

  if (parts.length === 0) return "U";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function TowerAuthBarSignedOut(props: { onOpenTowerEmailPopup: () => void }) {
  return (
    <Button type="button" size="sm" variant="ghost" onClick={props.onOpenTowerEmailPopup}>
      <LogIn aria-hidden />
      Sign in to Tower
    </Button>
  );
}

type TowerAuthBarProps = {
  user: BridgedTowerUser | undefined;
  isPending: boolean;
  onOpenTowerEmailPopup: () => void;
  onSignOut: () => void;
};

function TowerAuthBar({ user, isPending, onOpenTowerEmailPopup, onSignOut }: TowerAuthBarProps) {
  if (isPending) {
    return (
      <span className="inline-flex h-8 items-center gap-2 px-2 text-xs text-muted-foreground">
        <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-muted-foreground/80" />
        Checking session
      </span>
    );
  }

  if (!user) {
    return <TowerAuthBarSignedOut onOpenTowerEmailPopup={onOpenTowerEmailPopup} />;
  }

  const accountLabel = getAccountLabel(user.name, user.email);
  const initials = getAccountInitials(accountLabel);

  return (
    <div className="inline-flex max-w-full">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="max-w-[220px] min-w-0 justify-start">
            <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
              {initials}
            </span>
            <span className="truncate">{accountLabel}</span>
            <ChevronDown aria-hidden className="ml-1 size-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-60">
          <DropdownMenuLabel>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-xs font-normal text-muted-foreground">Signed in as</span>
              <span className="truncate text-sm font-medium text-foreground">{user.email}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              const origin = getTowerAuthBaseUrl();
              if (origin) window.open(origin, "_blank", "noopener,noreferrer");
            }}
          >
            <ExternalLink aria-hidden />
            Open Tower
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => {
              onSignOut();
            }}
          >
            <LogOut aria-hidden />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

type HeaderLogoProps = {
  /** When false, renders a div so the screen can use a separate page `<h1>` (e.g. Settings). */
  asHeading?: boolean;
  /** When set, the logo is a link to this route (e.g. home hub). */
  to?: string;
};

export function HeaderLogo({ asHeading = true, to }: HeaderLogoProps) {
  const className = "m-0 flex shrink-0 items-center justify-center text-lg font-medium leading-widest";
  const inner = (
    <>
      <span className="sr-only">Beacon</span>
      <img src={lightLogoSrc} alt="" aria-hidden className="h-4 w-auto dark:hidden" />
      <img src={darkLogoSrc} alt="" aria-hidden className="hidden h-4 w-auto dark:block" />
    </>
  );
  const block = asHeading ? <h1 className={className}>{inner}</h1> : <div className={className}>{inner}</div>;

  if (to) {
    return (
      <Link
        to={to}
        className="inline-flex shrink-0 rounded-sm text-foreground outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label="Beacon home"
      >
        {block}
      </Link>
    );
  }

  return block;
}

function BeaconRoutesMenu() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const itemClass = (path: string) =>
    cn(pathname === path && "bg-accent text-accent-foreground focus:bg-accent focus:text-accent-foreground");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 rounded-md border border-transparent px-1.5 text-muted-foreground hover:bg-muted/55 hover:text-foreground aria-expanded:bg-muted/70 aria-expanded:text-foreground"
          aria-label="Beacon menu"
        >
          <Menu aria-hidden className="size-4 stroke-[2.1]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuLabel>Tools</DropdownMenuLabel>
        <DropdownMenuItem className={itemClass("/images")} onSelect={() => navigate("/images")}>
          <ImageIcon aria-hidden />
          Images
        </DropdownMenuItem>
        {isBeaconsSurfaceEnabled() ? (
          <DropdownMenuItem
            className={cn(
              pathname.startsWith("/beacons") &&
                "bg-accent text-accent-foreground focus:bg-accent focus:text-accent-foreground"
            )}
            onSelect={() => navigate("/beacons/engine")}
          >
            <Radio aria-hidden />
            Beacons
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem className={itemClass("/settings")} onSelect={() => navigate("/settings")}>
          <Settings aria-hidden />
          Settings
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function HeaderWithTower() {
  const { user, isPending, clearStoredSession } = useBeaconTowerSession();
  const base = getTowerAuthBaseUrl();

  const openTowerEmailSignInPopup = useCallback(() => {
    const origin = encodeURIComponent(window.location.origin);
    window.open(`${base}/sign-in?beaconOrigin=${origin}`, "beacon-tower-auth", TOWER_EMAIL_AUTH_POPUP_FEATURES);
  }, [base]);

  const signOut = useCallback(() => {
    clearStoredSession();
  }, [clearStoredSession]);

  return (
    <div className="shrink-0">
      <header className="supports-backdrop-filter:bg-background/75 border-b border-border/70 bg-background/90 px-3 py-2 backdrop-blur">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2">
          <div className="min-w-0 overflow-hidden">
            <div className="max-w-full">
              <TowerAuthBar
                user={user}
                isPending={isPending}
                onOpenTowerEmailPopup={openTowerEmailSignInPopup}
                onSignOut={signOut}
              />
            </div>
          </div>
          <div className="flex shrink-0 justify-center px-2">
            <HeaderLogo to="/home" />
          </div>
          <div className="flex min-w-0 justify-end">
            <div className="flex min-w-0 shrink-0 items-center gap-1 pl-1">
              <BeaconRoutesMenu />
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}

export default function Header() {
  const towerOk = isTowerConfigured();

  if (towerOk) {
    return <HeaderWithTower />;
  }

  return (
    <div className="shrink-0">
      <header className="supports-backdrop-filter:bg-background/75 border-b border-border/70 bg-background/90 px-3 py-2 backdrop-blur">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2">
          <div className="min-w-0 overflow-hidden">
            <span className="inline-flex h-8 items-center px-2 text-xs text-muted-foreground">Tower unavailable</span>
          </div>
          <div className="flex shrink-0 justify-center px-2">
            <HeaderLogo to="/home" />
          </div>
          <div className="flex min-w-0 justify-end">
            <BeaconRoutesMenu />
          </div>
        </div>
      </header>
    </div>
  );
}
