import { resolveWebflowDesignerOpenLinks } from "@codalyn/webflow-kit";
import { IconExternalLink } from "@tabler/icons-react";
import { useMemo, useState } from "react";
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

export type BeaconDesignerOpenLinkProps = {
  siteDisplayName: string;
  shortName: string | null | undefined;
  webflowAppClientId: string | null | undefined;
  webflowBeaconMarketplaceUrl?: string | null;
};

function siteContextLabel(displayName: string): string {
  const trimmed = displayName.trim();
  if (trimmed.length === 0 || trimmed.toLowerCase() === "beacon") {
    return "this site";
  }
  return trimmed;
}

export function BeaconDesignerOpenLink(props: BeaconDesignerOpenLinkProps) {
  const { siteDisplayName, shortName, webflowAppClientId, webflowBeaconMarketplaceUrl } = props;
  const [installHelpOpen, setInstallHelpOpen] = useState(false);
  const siteLabel = siteContextLabel(siteDisplayName);

  const links = useMemo(
    () =>
      resolveWebflowDesignerOpenLinks({
        shortName,
        appClientId: webflowAppClientId,
      }),
    [shortName, webflowAppClientId]
  );

  if (links.openWithAppUrl == null && links.openDesignerUrl == null) {
    return (
      <p className="text-xs text-muted-foreground">
        Designer link unavailable for this site. Relink Webflow if the site was recently added.
      </p>
    );
  }

  const openPrimary = () => {
    if (links.openWithAppUrl) {
      window.open(links.openWithAppUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (links.openDesignerUrl) {
      window.open(links.openDesignerUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Button type="button" variant="link" size="sm" onClick={openPrimary}>
          Open in Designer
          <IconExternalLink aria-hidden data-icon="inline-end" stroke={1.75} />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setInstallHelpOpen(true)}>
          Need help opening Beacon?
        </Button>
      </div>

      <AlertDialog open={installHelpOpen} onOpenChange={setInstallHelpOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Beacon didn&apos;t open in the Designer</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Opening {siteLabel} in the Webflow Designer should launch the Beacon extension when it is authorized
                  for that site. If nothing appeared, work through the steps below.
                </p>
                <ol className="list-decimal space-y-2 pl-5">
                  <li>
                    Open {siteLabel} in the Webflow Designer
                    {links.openDesignerUrl ? (
                      <>
                        {" "}
                        (
                        <a
                          href={links.openDesignerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-foreground underline-offset-4 hover:underline"
                        >
                          open canvas
                        </a>
                        ).
                      </>
                    ) : (
                      "."
                    )}
                  </li>
                  <li>In the Designer, open the Apps panel and launch Beacon.</li>
                  <li>
                    If Beacon is not listed, a workspace admin must add it from Webflow → Apps &amp; Integrations
                    {webflowBeaconMarketplaceUrl ? (
                      <>
                        {" "}
                        or the{" "}
                        <a
                          href={webflowBeaconMarketplaceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-foreground underline-offset-4 hover:underline"
                        >
                          Webflow Marketplace
                        </a>
                      </>
                    ) : null}
                    .
                  </li>
                </ol>
                {links.openWithAppUrl ? (
                  <p>Once Beacon is available on the site, use Open in Designer to launch it directly.</p>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            {webflowBeaconMarketplaceUrl ? (
              <Button type="button" variant="outline" asChild>
                <a href={webflowBeaconMarketplaceUrl} target="_blank" rel="noopener noreferrer">
                  Get Beacon
                </a>
              </Button>
            ) : null}
            {links.openWithAppUrl ? (
              <AlertDialogAction
                onClick={() => {
                  window.open(links.openWithAppUrl ?? links.openDesignerUrl ?? "", "_blank", "noopener,noreferrer");
                }}
              >
                Try again in Designer
              </AlertDialogAction>
            ) : links.openDesignerUrl ? (
              <AlertDialogAction
                onClick={() => {
                  window.open(links.openDesignerUrl ?? "", "_blank", "noopener,noreferrer");
                }}
              >
                Open Designer
              </AlertDialogAction>
            ) : null}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
