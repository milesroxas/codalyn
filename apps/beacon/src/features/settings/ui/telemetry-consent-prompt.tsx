import { useState } from "react";
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
                  <li>Error reports</li>
                  <li>Feature usage</li>
                  <li>App version</li>
                  <li>Your current Webflow site and workspace IDs</li>
                </ul>
              </div>
              <p>
                We never collect page content, design content, session recordings, or autocaptured activity. Data is
                processed by PostHog (analytics) and Sentry (error reporting) on behalf of Codalyn.
              </p>
              <p>
                Sharing is optional. Nothing is sent unless you turn it on, and you can change your choice anytime in
                Settings &rarr; Privacy.
              </p>
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
