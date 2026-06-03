import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";
import { IconLayoutGrid } from "@tabler/icons-react";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  LogIn,
  LogOut,
  Menu,
  Settings,
} from "lucide-react";
import { type ReactNode, useCallback, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { isTowerConfigured, openTowerAppHome } from "@/features/auth/model/tower-auth-client";
import { useBeaconTowerInlineSignIn } from "@/features/auth/model/use-beacon-tower-inline-sign-in";
import { type BridgedTowerUser, useBeaconTowerSession } from "@/features/auth/model/use-beacon-tower-session";
import {
  BeaconTowerConnectionIndicator,
  type BeaconTowerConnectionStatus,
} from "@/features/auth/ui/beacon-tower-connection-indicator";
import { useCmsSlotsAccess } from "@/features/cms-slots/model/use-cms-slots-access";
import { useBeaconAppSettings } from "@/features/settings/model/beacon-app-settings-provider";
import { BeaconWorkspaceMenuGroup } from "@/features/settings/ui/beacon-workspace-control";
import { IMAGE_UPLOAD_FEATURE_NAME } from "@/shared/lib/beacon-feature-route-copy";
import { CMS_SLOTS_FEATURE_NAME } from "@/shared/lib/cms-slots-feature-copy";
import { isCmsSlotsSurfaceEnabled } from "@/shared/lib/cms-slots-surface-enabled";
import { useCmsCollectionTemplatePage } from "@/shared/lib/use-cms-collection-template-page";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

const lightLogoSrc = `${import.meta.env.BASE_URL}images/light-logo-beacon.svg`;
const darkLogoSrc = `${import.meta.env.BASE_URL}images/dark-logo-beacon.svg`;

/** Matches profile row (`size-8` avatar + default item padding). */
const beaconMenuProfileRowMinClass = "min-h-10";

const beaconMenuSectionLabelClass =
  "px-2 pb-0.5 pt-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground";

function BeaconMenuSectionLabel(props: { children: ReactNode }) {
  return <DropdownMenuLabel className={beaconMenuSectionLabelClass}>{props.children}</DropdownMenuLabel>;
}

function towerUserInitials(user: BridgedTowerUser): string {
  const n = user.name?.trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const a = parts[0]?.[0];
      const b = parts[parts.length - 1]?.[0];
      if (a && b) {
        return (a + b).toUpperCase();
      }
    }
    return n.slice(0, 2).toUpperCase();
  }
  const e = user.email.trim();
  return e ? e.slice(0, 1).toUpperCase() : "?";
}

function towerMenuProfileLabel(user: BridgedTowerUser): string {
  const raw = user.name?.trim();
  if (raw) {
    const parts = raw.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[parts.length - 1]}`;
    }
  }
  return user.email.trim();
}

function BeaconMenuTowerActionsPane(props: { onBack: () => void; onOpenTower: () => void; onSignOut: () => void }) {
  const { onBack, onOpenTower, onSignOut } = props;

  return (
    <>
      <DropdownMenuGroup>
        <DropdownMenuItem
          className={beaconMenuProfileRowMinClass}
          onSelect={(event) => {
            event.preventDefault();
            onBack();
          }}
        >
          <ChevronLeft aria-hidden />
          Back
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem
          onSelect={() => {
            onOpenTower();
          }}
        >
          <ExternalLink aria-hidden />
          Open Tower
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => {
            onSignOut();
          }}
        >
          <LogOut aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuGroup>
    </>
  );
}

type HeaderLogoProps = {
  asHeading?: boolean;
  to?: string;
};

export function HeaderLogo({ asHeading = true, to }: HeaderLogoProps) {
  const className = "m-0 flex shrink-0 items-center justify-center text-lg font-medium leading-widest";
  const inner = (
    <>
      <span className="sr-only">Beacon</span>
      <img src={lightLogoSrc} alt="" aria-hidden className="h-5 w-auto dark:hidden" />
      <img src={darkLogoSrc} alt="" aria-hidden className="hidden h-5 w-auto dark:block" />
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

function routeActiveClass(path: string, pathname: string) {
  return cn(
    pathname === path && "bg-accent font-medium text-accent-foreground focus:bg-accent focus:text-accent-foreground"
  );
}

type BeaconAppMenuProps = {
  towerConfigured: boolean;
  user: BridgedTowerUser | undefined;
  sessionPending: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
};

function BeaconMenuNavigateGroup(props: { pathname: string }) {
  const { pathname } = props;
  const navigate = useNavigate();
  const { defaultSegment } = useCmsSlotsAccess();
  const { ready: cmsPageKindReady, isCmsCollectionTemplatePage } = useCmsCollectionTemplatePage();
  const showCmsSlotsNav = isCmsSlotsSurfaceEnabled() && cmsPageKindReady && isCmsCollectionTemplatePage;

  return (
    <DropdownMenuGroup>
      <BeaconMenuSectionLabel>Tools</BeaconMenuSectionLabel>
      {showCmsSlotsNav ? (
        <DropdownMenuItem
          className={cn(
            pathname.startsWith("/cms-slots") &&
              "bg-accent font-medium text-accent-foreground focus:bg-accent focus:text-accent-foreground"
          )}
          onSelect={() => navigate(`/cms-slots/${defaultSegment}`)}
        >
          <IconLayoutGrid aria-hidden />
          {CMS_SLOTS_FEATURE_NAME}
        </DropdownMenuItem>
      ) : null}
      <DropdownMenuItem className={routeActiveClass("/images", pathname)} onSelect={() => navigate("/images")}>
        <ImageIcon aria-hidden />
        {IMAGE_UPLOAD_FEATURE_NAME}
      </DropdownMenuItem>
    </DropdownMenuGroup>
  );
}

function BeaconMenuSettingsGroup(props: { pathname: string }) {
  const { pathname } = props;
  const navigate = useNavigate();

  return (
    <DropdownMenuGroup>
      <DropdownMenuItem className={routeActiveClass("/settings", pathname)} onSelect={() => navigate("/settings")}>
        <Settings aria-hidden />
        Settings
      </DropdownMenuItem>
    </DropdownMenuGroup>
  );
}

function BeaconMenuAccountGroup(props: {
  user: BridgedTowerUser | undefined;
  sessionPending: boolean;
  onSignIn: () => void;
  onOpenTowerActions: () => void;
}) {
  const { user, sessionPending, onSignIn, onOpenTowerActions } = props;
  const showSessionPending = useDeferredLoadingIndicator(sessionPending);

  return (
    <DropdownMenuGroup>
      {sessionPending || !user ? <BeaconMenuSectionLabel>Account</BeaconMenuSectionLabel> : null}
      {showSessionPending ? (
        <div
          className="flex items-center gap-2 px-2 py-2 text-muted-foreground text-sm"
          aria-live="polite"
          aria-busy="true"
        >
          <Loader2 aria-hidden className="size-4 shrink-0 animate-spin opacity-70" />
          Checking session…
        </div>
      ) : !user ? (
        <div data-slot="beacon-menu-account-guest" className="space-y-2 pb-1">
          <DropdownMenuItem className="font-medium text-foreground" onSelect={() => onSignIn()}>
            <LogIn aria-hidden />
            Sign in to Tower
          </DropdownMenuItem>
        </div>
      ) : (
        <DropdownMenuItem
          className={beaconMenuProfileRowMinClass}
          data-slot="beacon-menu-account-summary"
          onSelect={(event) => {
            event.preventDefault();
            onOpenTowerActions();
          }}
        >
          <span className="sr-only">Signed in as {user.email}</span>
          {user.image ? (
            <img
              src={user.image}
              alt=""
              aria-hidden
              className="size-8 shrink-0 rounded-full object-cover ring-1 ring-inset ring-border"
            />
          ) : (
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground text-[0.625rem] ring-1 ring-inset ring-border">
              {towerUserInitials(user)}
            </div>
          )}
          <span className="min-w-0 flex-1 truncate text-left font-normal text-sm text-foreground">
            {towerMenuProfileLabel(user)}
          </span>
          <ChevronRight aria-hidden className="pointer-events-none size-4 shrink-0 text-muted-foreground opacity-70" />
        </DropdownMenuItem>
      )}
    </DropdownMenuGroup>
  );
}

function BeaconTowerUnavailableBanner() {
  return (
    <DropdownMenuGroup>
      <BeaconMenuSectionLabel>Account</BeaconMenuSectionLabel>
      <div
        data-slot="beacon-menu-account-banner"
        className="mx-2 rounded-sm bg-muted/50 px-2.5 py-2 text-muted-foreground text-xs leading-relaxed"
      >
        Tower isn’t configured for this app. Sign-in and preset sync aren’t available.
      </div>
    </DropdownMenuGroup>
  );
}

function BeaconMenuWorkspaceSection() {
  const { syncState, beaconWorkspaces, activeOrganizationId, setActiveBeaconWorkspace } = useBeaconAppSettings();

  return (
    <BeaconWorkspaceMenuGroup
      syncState={syncState}
      workspaces={beaconWorkspaces}
      activeOrganizationId={activeOrganizationId}
      onSelectWorkspace={setActiveBeaconWorkspace}
    />
  );
}

function BeaconAppMenu({ towerConfigured, user, sessionPending, onSignIn, onSignOut }: BeaconAppMenuProps) {
  const { pathname } = useLocation();
  const [towerActionsOpen, setTowerActionsOpen] = useState(false);

  const openTowerApp = useCallback(() => {
    openTowerAppHome();
  }, []);

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) {
          setTowerActionsOpen(false);
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="headerMenu" aria-haspopup="menu">
          <Menu aria-hidden className="size-[1.05rem]" strokeWidth={2} />
          Menu
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-62 max-w-[min(17.5rem,calc(100vw-2rem))] rounded-sm">
        {!towerConfigured ? (
          <>
            <BeaconTowerUnavailableBanner />
            <DropdownMenuSeparator />
            <BeaconMenuNavigateGroup pathname={pathname} />
            <DropdownMenuSeparator />
            <BeaconMenuSettingsGroup pathname={pathname} />
          </>
        ) : towerActionsOpen ? (
          <BeaconMenuTowerActionsPane
            onBack={() => setTowerActionsOpen(false)}
            onOpenTower={openTowerApp}
            onSignOut={onSignOut}
          />
        ) : (
          <>
            <BeaconMenuAccountGroup
              user={user}
              sessionPending={sessionPending}
              onSignIn={onSignIn}
              onOpenTowerActions={() => setTowerActionsOpen(true)}
            />
            {user ? (
              <>
                <DropdownMenuSeparator />
                <BeaconMenuWorkspaceSection />
              </>
            ) : null}
            <DropdownMenuSeparator />
            <BeaconMenuNavigateGroup pathname={pathname} />
            <DropdownMenuSeparator />
            <BeaconMenuSettingsGroup pathname={pathname} />
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function resolveTowerConnectionStatus(props: {
  towerConfigured: boolean;
  user: BridgedTowerUser | undefined;
  sessionPending: boolean;
}): BeaconTowerConnectionStatus | null {
  if (!props.towerConfigured) {
    return null;
  }
  if (props.sessionPending) {
    return "connecting";
  }
  return props.user ? "connected" : "disconnected";
}

function HeaderShell(props: BeaconAppMenuProps) {
  const towerConnectionStatus = resolveTowerConnectionStatus(props);

  return (
    <div className="shrink-0">
      <header data-slot="beacon-app-header" className="border-border/65 border-b bg-background px-4 py-2.5">
        <div className="flex items-center justify-between gap-4">
          <HeaderLogo to="/home" />
          <div className="flex shrink-0 items-center gap-2">
            {towerConnectionStatus ? <BeaconTowerConnectionIndicator status={towerConnectionStatus} /> : null}
            <BeaconAppMenu {...props} />
          </div>
        </div>
      </header>
    </div>
  );
}

function HeaderWithTower() {
  const { user, isPending, clearStoredSession } = useBeaconTowerSession();
  const { signIn } = useBeaconTowerInlineSignIn();

  return (
    <HeaderShell
      towerConfigured
      user={user}
      sessionPending={isPending}
      onSignIn={signIn}
      onSignOut={clearStoredSession}
    />
  );
}

export default function Header() {
  if (!isTowerConfigured()) {
    return (
      <HeaderShell
        towerConfigured={false}
        user={undefined}
        sessionPending={false}
        onSignIn={() => {}}
        onSignOut={() => {}}
      />
    );
  }

  return <HeaderWithTower />;
}
