import { ExternalLink, Loader2, LogOut } from "lucide-react";
import type {
  WebflowAuthorizeAnchorProps,
  WebflowAuthorizeLinkState,
} from "@/features/auth/model/use-webflow-authorize-link";
import { Button } from "@/shared/ui/button";
import { ScrollArea } from "@/shared/ui/scroll-area";

/** Authorize-error code → a short, actionable message. */
export function messageForAuthorizeError(error: string): string {
  switch (error) {
    case "team_admin_required":
      return "Only a workspace admin can authorize sites in Webflow. Ask an admin to connect this site.";
    case "no_active_workspace":
      return "No workspace is active for this session. Choose one from the menu, then try again.";
    case "unauthorized":
      return "Your Tower session expired. Sign out and sign in again.";
    case "webflow_identity_required":
      return "Sign in to Tower from the Webflow Designer so the connection can be tied to your Webflow account, then try again.";
    case "tower_unreachable":
      return "Couldn't reach Tower. Check your connection and try again.";
    default:
      return "Couldn't start Webflow authorization. Try again.";
  }
}

export type WebflowAuthorizeGateViewProps = {
  siteLabel: string;
  state: WebflowAuthorizeLinkState;
  /** Anchor props for the consent link; present only while `state.kind === "ready"`. */
  linkProps: WebflowAuthorizeAnchorProps | null;
  onRetry: () => void;
  onSignOut: () => void;
};

/**
 * Presentational body of the site-authorization gate. The consent screen opens through an ordinary
 * `<a target="_blank">` link — the extension spawns no windows — so the primary action is a link
 * while the authorize URL is ready, a disabled "Preparing…" button while it is being minted, and a
 * "Try again" button after a mint failure.
 */
export function WebflowAuthorizeGateView(props: WebflowAuthorizeGateViewProps) {
  const { siteLabel, state, linkProps, onRetry, onSignOut } = props;

  return (
    <ScrollArea className="min-h-0 min-w-0 flex-1">
      <div className="flex min-h-full min-w-0 flex-col items-center justify-center px-4 py-8">
        <div className="mx-auto w-full max-w-sm space-y-4 text-center">
          <p className="text-sm text-foreground">
            Authorize <span className="font-medium">{siteLabel}</span> in Webflow to continue. The consent screen opens
            in a new tab; Beacon unlocks automatically once you approve.
          </p>
          {state.kind === "error" ? (
            <p className="text-xs leading-snug text-destructive" role="alert">
              {messageForAuthorizeError(state.error)}
            </p>
          ) : null}
          {state.kind === "ready" && linkProps ? (
            <Button asChild className="w-full">
              <a {...linkProps}>
                <ExternalLink aria-hidden data-icon="inline-start" />
                Open Webflow authorization
              </a>
            </Button>
          ) : state.kind === "error" ? (
            <Button type="button" className="w-full" onClick={onRetry}>
              Try again
            </Button>
          ) : (
            <Button type="button" className="w-full" disabled aria-busy>
              <Loader2 aria-hidden data-icon="inline-start" className="animate-spin" />
              Preparing Webflow authorization…
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-full justify-center text-[11px] text-muted-foreground"
            onClick={onSignOut}
          >
            <LogOut aria-hidden data-icon="inline-start" />
            Sign out
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}
