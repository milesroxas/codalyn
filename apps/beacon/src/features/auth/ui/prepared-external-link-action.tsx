import { ExternalLink, Loader2 } from "lucide-react";
import type {
  PreparedExternalLinkAnchorProps,
  PreparedExternalLinkState,
} from "@/features/auth/model/use-prepared-external-link";
import { Button } from "@/shared/ui/button";

export type PreparedExternalLinkActionLabels = {
  /** Idle: the button whose click mints the destination. */
  prepare: string;
  /** While Tower mints the destination. */
  preparing: string;
  /** Ready: the new-tab anchor. */
  open: string;
  /** After a failed mint (defaults to "Try again"). */
  retry?: string;
};

export type PreparedExternalLinkActionProps = {
  state: PreparedExternalLinkState;
  /** Anchor props for the minted destination; present only while `state.kind === "ready"`. */
  linkProps: PreparedExternalLinkAnchorProps | null;
  onPrepare: () => void;
  labels: PreparedExternalLinkActionLabels;
  /** Error code → short, actionable copy (defaults to a generic line). */
  messageForError?: (error: string) => string;
};

/**
 * The primary action for a destination Tower mints on demand (`usePreparedExternalLink`): an idle
 * button that mints on the click, a busy button while minting, a plain new-tab anchor once the
 * destination is ready, and a retry after a failure — one control, four states, no request before the
 * user acts and no window opened by script.
 */
export function PreparedExternalLinkAction(props: PreparedExternalLinkActionProps) {
  const { state, linkProps, onPrepare, labels, messageForError } = props;

  if (state.kind === "ready" && linkProps) {
    return (
      <Button asChild className="w-full">
        <a {...linkProps}>
          <ExternalLink aria-hidden data-icon="inline-start" />
          {labels.open}
        </a>
      </Button>
    );
  }
  if (state.kind === "preparing") {
    return (
      <Button type="button" className="w-full" disabled aria-busy>
        <Loader2 aria-hidden data-icon="inline-start" className="animate-spin" />
        {labels.preparing}
      </Button>
    );
  }
  if (state.kind === "error") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs leading-snug text-destructive" role="alert">
          {messageForError ? messageForError(state.error) : "Couldn't prepare the link. Try again."}
        </p>
        <Button type="button" className="w-full" onClick={onPrepare}>
          {labels.retry ?? "Try again"}
        </Button>
      </div>
    );
  }
  return (
    <Button type="button" className="w-full" onClick={onPrepare}>
      <ExternalLink aria-hidden data-icon="inline-start" />
      {labels.prepare}
    </Button>
  );
}
