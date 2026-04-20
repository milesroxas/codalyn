import { ChevronDown, LogIn, LogOut } from "lucide-react";
import {
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { readBeaconTowerSessionToken } from "@/features/auth/lib/webflow-designer-session";
import { getTowerAuthBaseUrl, isTowerConfigured } from "@/features/auth/model/tower-auth-client";
import { type BridgedTowerUser, useBeaconTowerSession } from "@/features/auth/model/use-beacon-tower-session";
import { towerFetch } from "@/shared/lib/tower-client";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { ThemeToggle } from "@/shared/ui/theme-toggle";

const lightLogoSrc = `${import.meta.env.BASE_URL}images/light-logo-beacon.svg`;
const darkLogoSrc = `${import.meta.env.BASE_URL}images/dark-logo-beacon.svg`;

/** Tower sign-in / sign-up (`max-w-sm` form + errors + Sign up link). */
const TOWER_EMAIL_AUTH_POPUP_FEATURES = "popup=yes,width=540,height=780,scrollbars=yes,resizable=yes";

/** Webflow OAuth authorize (provider consent UI). */
const WEBFLOW_OAUTH_POPUP_FEATURES = "popup=yes,width=600,height=760,scrollbars=yes,resizable=yes";

type WebflowConnectionState = "checking" | "connected" | "disconnected";

function getAccountLabel(name: string | null | undefined, email: string): string {
  const trimmedName = name?.trim();
  return trimmedName && trimmedName.length > 0 ? trimmedName : email;
}

async function openBeaconWebflowOAuthPopup(towerBase: string, onUnavailable: () => void): Promise<void> {
  const token = readBeaconTowerSessionToken();
  const res = await fetch(`${towerBase}/api/integrations/webflow/authorize`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  let data: { url?: string } = {};
  try {
    data = (await res.json()) as { url?: string };
  } catch {
    /* ignore */
  }
  if (!res.ok || !data.url) {
    onUnavailable();
    return;
  }
  window.open(data.url, "beacon-webflow-oauth", WEBFLOW_OAUTH_POPUP_FEATURES);
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

function towerOriginMatchesMessage(evOrigin: string, towerBase: string): boolean {
  try {
    return Boolean(towerBase) && new URL(towerBase).origin === evOrigin;
  } catch {
    return false;
  }
}

/**
 * Whether the stored Webflow OAuth token can call the Data API.
 * Uses `GET /v2/sites` (needs `sites:read`), not `token/authorized_by` (needs `authorized_user:read`),
 * so the pill matches tokens issued under Beacon’s default OAuth scopes.
 */
async function fetchWebflowAuthorized(signal?: AbortSignal): Promise<boolean> {
  const response = await towerFetch("/api/v2/webflow/sites?limit=1", { signal });
  return response.ok;
}

function applyWebflowOauthWindowMessage(
  ev: MessageEvent,
  ctx: {
    base: string;
    userEmail: string | undefined;
    checkGenerationRef: MutableRefObject<number>;
    setWebflowConnection: Dispatch<SetStateAction<WebflowConnectionState>>;
  }
): void {
  const { base, userEmail, checkGenerationRef, setWebflowConnection } = ctx;
  if (!towerOriginMatchesMessage(ev.origin, base)) return;
  const data = ev.data as Record<string, unknown> | null;
  if (data?.type !== "codalyn:webflow-oauth") return;
  if (data.status === "error") {
    setWebflowConnection("disconnected");
    return;
  }
  if (data.status !== "success") return;
  if (!userEmail) return;

  const gen = checkGenerationRef.current;
  setWebflowConnection("checking");
  void fetchWebflowAuthorized()
    .then((ok) => {
      if (gen !== checkGenerationRef.current) return;
      setWebflowConnection(ok ? "connected" : "disconnected");
    })
    .catch(() => {
      if (gen !== checkGenerationRef.current) return;
      setWebflowConnection("disconnected");
    });
}

function useWebflowExtensionConnection(
  base: string,
  userEmail: string | undefined
): [WebflowConnectionState, Dispatch<SetStateAction<WebflowConnectionState>>] {
  const [webflowConnection, setWebflowConnection] = useState<WebflowConnectionState>("checking");
  const checkGenerationRef = useRef(0);

  useEffect(() => {
    if (!userEmail || !base) {
      checkGenerationRef.current += 1;
      setWebflowConnection("disconnected");
      return;
    }

    const gen = ++checkGenerationRef.current;
    const ac = new AbortController();
    setWebflowConnection("checking");

    void fetchWebflowAuthorized(ac.signal)
      .then((ok) => {
        if (gen !== checkGenerationRef.current) return;
        setWebflowConnection(ok ? "connected" : "disconnected");
      })
      .catch((e: unknown) => {
        if (gen !== checkGenerationRef.current) return;
        if (e instanceof DOMException && e.name === "AbortError") return;
        setWebflowConnection("disconnected");
      });

    return () => {
      ac.abort();
    };
  }, [base, userEmail]);

  useEffect(() => {
    if (!userEmail || !base) {
      return;
    }

    function refreshSilently() {
      if (document.visibilityState !== "visible") return;
      const gen = checkGenerationRef.current;
      void fetchWebflowAuthorized()
        .then((ok) => {
          if (gen !== checkGenerationRef.current) return;
          setWebflowConnection(ok ? "connected" : "disconnected");
        })
        .catch(() => {
          if (gen !== checkGenerationRef.current) return;
          setWebflowConnection("disconnected");
        });
    }

    window.addEventListener("focus", refreshSilently);
    document.addEventListener("visibilitychange", refreshSilently);
    return () => {
      window.removeEventListener("focus", refreshSilently);
      document.removeEventListener("visibilitychange", refreshSilently);
    };
  }, [base, userEmail]);

  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      applyWebflowOauthWindowMessage(ev, {
        base,
        userEmail,
        checkGenerationRef,
        setWebflowConnection,
      });
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [base, userEmail]);

  return [webflowConnection, setWebflowConnection];
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

type WebflowConnectionControlProps = {
  user: BridgedTowerUser | undefined;
  isSessionPending: boolean;
  webflowConnection: WebflowConnectionState;
  onOpenWebflowOAuthPopup: () => void;
};

function WebflowConnectionControl({
  user,
  isSessionPending,
  webflowConnection,
  onOpenWebflowOAuthPopup,
}: WebflowConnectionControlProps) {
  if (isSessionPending || !user) {
    return null;
  }

  if (webflowConnection === "checking") {
    return (
      <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full border border-border/80 bg-muted/40 px-2 text-[10px] leading-none text-muted-foreground">
        <span aria-hidden className="size-1.5 shrink-0 animate-pulse rounded-full bg-amber-500 dark:bg-amber-400" />
        Checking
      </span>
    );
  }

  if (webflowConnection === "connected") {
    return (
      <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2 text-[10px] font-medium leading-none text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-300">
        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-emerald-500 dark:bg-emerald-400" />
        Connected
      </span>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      className="shrink-0 rounded-full border border-border/80 bg-muted/30 text-[10px] font-medium leading-none text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      onClick={onOpenWebflowOAuthPopup}
    >
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
      Connect
    </Button>
  );
}

function HeaderLogo() {
  return (
    <h1 className="m-0 flex shrink-0 items-center justify-center text-lg font-medium leading-widest">
      <span className="sr-only">Beacon</span>
      <img src={lightLogoSrc} alt="" aria-hidden className="h-4 w-auto dark:hidden" />
      <img src={darkLogoSrc} alt="" aria-hidden className="hidden h-4 w-auto dark:block" />
    </h1>
  );
}

function HeaderWithTower() {
  const { user, isPending, clearStoredSession } = useBeaconTowerSession();
  const base = getTowerAuthBaseUrl();
  const [webflowConnection, setWebflowConnection] = useWebflowExtensionConnection(base, user?.email);

  const openTowerEmailSignInPopup = useCallback(() => {
    const origin = encodeURIComponent(window.location.origin);
    window.open(`${base}/sign-in?beaconOrigin=${origin}`, "beacon-tower-auth", TOWER_EMAIL_AUTH_POPUP_FEATURES);
  }, [base]);

  const openWebflowOAuthPopup = useCallback(() => {
    setWebflowConnection("checking");
    void openBeaconWebflowOAuthPopup(base, () => setWebflowConnection("disconnected"));
  }, [base, setWebflowConnection]);

  const signOut = useCallback(() => {
    setWebflowConnection("disconnected");
    clearStoredSession();
  }, [clearStoredSession, setWebflowConnection]);

  return (
    <header className="supports-backdrop-filter:bg-background/75 relative border-b border-border/70 bg-background/90 px-3 py-2 backdrop-blur">
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
          <HeaderLogo />
        </div>
        <div className="flex min-w-0 justify-end">
          <div className="flex min-w-0 shrink-0 items-center gap-1 pl-1">
            <WebflowConnectionControl
              user={user}
              isSessionPending={isPending}
              webflowConnection={webflowConnection}
              onOpenWebflowOAuthPopup={openWebflowOAuthPopup}
            />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}

export default function Header() {
  const towerOk = isTowerConfigured();

  if (towerOk) {
    return <HeaderWithTower />;
  }

  return (
    <header className="supports-backdrop-filter:bg-background/75 relative border-b border-border/70 bg-background/90 px-3 py-2 backdrop-blur">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2">
        <div className="min-w-0 overflow-hidden">
          <span className="inline-flex h-8 items-center px-2 text-xs text-muted-foreground">Tower unavailable</span>
        </div>
        <div className="flex shrink-0 justify-center px-2">
          <HeaderLogo />
        </div>
        <div className="flex min-w-0 justify-end">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
