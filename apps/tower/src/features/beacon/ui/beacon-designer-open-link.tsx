import { resolveWebflowDesignerOpenLinks } from "@codalyn/webflow-kit";
import { IconExternalLink } from "@tabler/icons-react";
import type { VariantProps } from "class-variance-authority";
import { Button, type buttonVariants } from "@/shared/ui/button";

export type BeaconDesignerOpenLinkProps = {
  shortName: string | null | undefined;
  webflowAppClientId: string | null | undefined;
  variant?: VariantProps<typeof buttonVariants>["variant"];
};

export function BeaconDesignerOpenLink(props: BeaconDesignerOpenLinkProps) {
  const { shortName, webflowAppClientId, variant = "outline" } = props;
  const links = resolveWebflowDesignerOpenLinks({
    shortName,
    appClientId: webflowAppClientId,
  });
  const designerUrl = links.openWithAppUrl ?? links.openDesignerUrl;

  if (designerUrl == null) {
    return (
      <p className="max-w-sm text-start text-xs text-muted-foreground">
        Designer link unavailable for this site. Relink Webflow if the site was recently added.
      </p>
    );
  }

  return (
    <Button asChild variant={variant} size="sm" width="fit">
      <a href={designerUrl} target="_blank" rel="noopener noreferrer">
        Open in Designer
        <IconExternalLink aria-hidden data-icon="inline-end" stroke={1.75} />
      </a>
    </Button>
  );
}
