import { LogOut } from "lucide-react";
import type {
  WebflowAuthorizeAnchorProps,
  WebflowAuthorizeLinkState,
} from "@/features/auth/model/use-webflow-authorize-link";
import { PreparedExternalLinkAction } from "@/features/auth/ui/prepared-external-link-action";
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

export const WEBFLOW_AUTHORIZE_CONNECT_LABEL = "Connect site in Webflow";
export const WEBFLOW_AUTHORIZE_OPEN_LABEL = "Open Webflow authorization";

export type WebflowAuthorizeGateViewProps = {
  siteLabel: string;
  state: WebflowAuthorizeLinkState;
  /** Anchor props for the consent link; present only while `state.kind === "ready"`. */
  linkProps: WebflowAuthorizeAnchorProps | null;
  /** The explicit Connect action: mints the authorize URL (and retries after a failure). */
  onConnect: () => void;
  onSignOut: () => void;
};

/**
 * Presentational body of the site-authorization gate: the user is signed in (their session was
 * restored without any OAuth), but the site open in the Designer is not in the workspace's existing
 * Webflow authorization. This is a *new* authorization for that site, so it is asked for explicitly:
 * "Connect site in Webflow" mints the authorize URL on the click, and the consent screen then opens
 * through an ordinary `<a target="_blank">` link — the extension spawns no windows.
 */
export function WebflowAuthorizeGateView(props: WebflowAuthorizeGateViewProps) {
  const { siteLabel, state, linkProps, onConnect, onSignOut } = props;

  return (
    <ScrollArea className="min-h-0 min-w-0 flex-1">
      <div className="flex min-h-full min-w-0 flex-col items-center justify-center px-4 py-8">
        <div className="mx-auto w-full max-w-sm space-y-4 text-center">
          <h2 className="text-base font-semibold text-foreground">Authorize this site in Webflow</h2>
          <p className="text-sm text-muted-foreground">
            You're signed in, but <span className="font-medium text-foreground">{siteLabel}</span> isn't part of your
            workspace's Webflow authorization yet. Connecting it opens Webflow's consent screen in a new tab; Beacon
            unlocks once you approve. Your existing authorization for other sites is not affected.
          </p>
          <PreparedExternalLinkAction
            state={state}
            linkProps={linkProps}
            onPrepare={onConnect}
            labels={{
              prepare: WEBFLOW_AUTHORIZE_CONNECT_LABEL,
              preparing: "Preparing Webflow authorization…",
              open: WEBFLOW_AUTHORIZE_OPEN_LABEL,
            }}
            messageForError={messageForAuthorizeError}
          />
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
