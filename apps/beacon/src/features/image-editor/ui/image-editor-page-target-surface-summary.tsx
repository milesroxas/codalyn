import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";
import { Loader2 } from "lucide-react";
import type * as React from "react";
import { imagePageTargetTablerIcon } from "@/features/image-editor/lib/image-editor-page-target-icon";
import {
  IMAGE_TARGET_STEP_DISCOVERY_PENDING,
  IMAGE_TARGET_STEP_NO_SURFACE_SELECTED,
  IMAGE_TARGET_STEP_SELECTED_SURFACE_LABEL,
} from "@/features/image-editor/lib/image-editor-target-step-copy";
import {
  formatImagePageTargetKindLabel,
  formatImagePageTargetPrimaryLabel,
} from "@/features/image-editor/lib/image-editor-target-surface-label";
import type { ImagePageTarget } from "@/features/image-editor/lib/scan-image-targets-on-page";
import {
  SurfaceSummaryCard,
  SurfaceSummaryCardEmpty,
  SurfaceSummaryCardIconBox,
  SurfaceSummaryCardIconRowCopy,
  SurfaceSummaryCardMeta,
  SurfaceSummaryCardPanelSectionLabel,
  SurfaceSummaryCardPending,
  SurfaceSummaryCardSurfaceDisplay,
  SurfaceSummaryCardSurfaceSummary,
  SurfaceSummaryCardTitle,
} from "@/shared/ui/surface-summary-card";

type ImagePageTargetSurfaceSummaryProps = {
  target: ImagePageTarget | null;
  discoveryPending?: boolean;
  /** Optional action rendered on the card, e.g. the page-scan trigger. */
  action?: React.ReactNode;
};

export function ImagePageTargetSurfaceSummary(props: ImagePageTargetSurfaceSummaryProps) {
  const { target, discoveryPending = false, action } = props;
  const showDiscoveryPending = useDeferredLoadingIndicator(discoveryPending);
  const SurfaceIcon = target ? imagePageTargetTablerIcon(target.kind) : imagePageTargetTablerIcon("image");

  return (
    <SurfaceSummaryCardSurfaceSummary>
      <SurfaceSummaryCardPanelSectionLabel>
        {IMAGE_TARGET_STEP_SELECTED_SURFACE_LABEL}
      </SurfaceSummaryCardPanelSectionLabel>
      {showDiscoveryPending ? (
        <SurfaceSummaryCard state="empty">
          <SurfaceSummaryCardPending>
            <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
            {IMAGE_TARGET_STEP_DISCOVERY_PENDING}
          </SurfaceSummaryCardPending>
        </SurfaceSummaryCard>
      ) : target == null ? (
        <SurfaceSummaryCard state="empty">
          <SurfaceSummaryCardEmpty>{IMAGE_TARGET_STEP_NO_SURFACE_SELECTED}</SurfaceSummaryCardEmpty>
        </SurfaceSummaryCard>
      ) : (
        <SurfaceSummaryCardSurfaceDisplay frame="card">
          <SurfaceSummaryCardIconBox>
            <SurfaceIcon aria-hidden stroke={1.5} />
          </SurfaceSummaryCardIconBox>
          <SurfaceSummaryCardIconRowCopy>
            <SurfaceSummaryCardTitle>{formatImagePageTargetPrimaryLabel(target)}</SurfaceSummaryCardTitle>
            <SurfaceSummaryCardMeta>{formatImagePageTargetKindLabel(target)}</SurfaceSummaryCardMeta>
          </SurfaceSummaryCardIconRowCopy>
        </SurfaceSummaryCardSurfaceDisplay>
      )}
      {action}
    </SurfaceSummaryCardSurfaceSummary>
  );
}
