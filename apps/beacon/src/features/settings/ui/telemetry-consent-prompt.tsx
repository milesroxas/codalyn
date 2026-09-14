import { useState } from "react";
import { CODALYN_PRIVACY_POLICY_URL, codalynPolicyLinkProps } from "@/shared/lib/codalyn-links";
import { applyTelemetryConsent } from "@/shared/lib/init-observability";
import { readTelemetryConsent } from "@/shared/lib/telemetry-preference";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";

/**
 * First-run telemetry consent gate (Webflow Marketplace Privacy & Data Protection). Telemetry is
 * opt-in: no analytics or error reporting runs until the user chooses here (or in Settings →
 * Privacy). Escape leaves the decision unset — telemetry stays off and the prompt returns next
 * launch — so a dismissal is never silently recorded as consent either way.
 */
export function TelemetryConsentPrompt() {
  const [open, setOpen] = useState(() => readTelemetryConsent() === null);

  if (!open) {
    return null;
  }

  const decide = (granted: boolean) => {
    applyTelemetryConsent(granted ? "granted" : "denied");
    setOpen(false);
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent onEscapeKeyDown={() => setOpen(false)}>
        <AlertDialogHeader>
          <AlertDialogTitle>Help improve Beacon</AlertDialogTitle>
          <AlertDialogDescription size="xs" asChild>
            <div className="grid gap-2.5">
              <p>Share anonymous usage and error data to help us fix bugs and improve Beacon.</p>
              <div className="grid gap-1">
                <p>If you choose to share, we&rsquo;ll collect:</p>
                <ul className="grid list-disc gap-0.5 pl-4">
                  <li>Error reports (message and stack trace)</li>
                  <li>Feature usage events</li>
                  <li>App version, release channel, and build details</li>
                  <li>Your current Webflow site and workspace identifiers and names</li>
                  <li>Basic browser and device details (browser, operating system, language, screen size)</li>
                </ul>
              </div>
              <p>
                We never collect page content, design content, session recordings, autocaptured activity, location, or
                referrer. Data is processed by PostHog (analytics and error reporting) on behalf of Codalyn.
              </p>
              <p>
                Sharing is optional. Nothing is sent unless you turn it on, and you can change your choice anytime in
                Settings &rarr; Privacy.
              </p>
              <Button asChild variant="link" size="2xs" className="justify-self-start px-0">
                <a {...codalynPolicyLinkProps(CODALYN_PRIVACY_POLICY_URL)}>Read the privacy policy</a>
              </Button>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel type="button" onClick={() => decide(false)}>
            No thanks
          </AlertDialogCancel>
          <AlertDialogAction type="button" onClick={() => decide(true)}>
            Share data
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
