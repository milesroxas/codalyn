import { IconChevronRight } from "@tabler/icons-react";
import { Loader2, RefreshCw } from "lucide-react";

import { imagePageTargetTablerIcon } from "@/features/image-editor/lib/image-editor-page-target-icon";
import {
  IMAGE_TARGET_STEP_EMPTY,
  IMAGE_TARGET_STEP_ON_PAGE,
  IMAGE_TARGET_STEP_SCAN_PENDING,
} from "@/features/image-editor/lib/image-editor-target-step-copy";
import {
  formatImagePageTargetKindLabel,
  formatImagePageTargetPrimaryLabel,
} from "@/features/image-editor/lib/image-editor-target-surface-label";
import type { ImagePageTarget } from "@/features/image-editor/lib/scan-image-targets-on-page";
import { Button } from "@/shared/ui/button";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import {
  SurfaceSummaryCardIconBox,
  SurfaceSummaryCardIconRowCopy,
  SurfaceSummaryCardMeta,
  SurfaceSummaryCardOptionRowChevron,
  SurfaceSummaryCardScanListError,
  SurfaceSummaryCardScanListSection,
  SurfaceSummaryCardScanListSectionHeader,
  SurfaceSummaryCardScanListSectionLabel,
  SurfaceSummaryCardScanListStatus,
  SurfaceSummaryCardSelectRow,
  SurfaceSummaryCardSelectRowList,
  SurfaceSummaryCardTitle,
} from "@/shared/ui/surface-summary-card";

type ImagePageTargetSelectListProps = {
  idPrefix: string;
  targets: ImagePageTarget[];
  selectedTarget: ImagePageTarget | null;
  onSelectTarget: (target: ImagePageTarget) => void;
};

export function ImagePageTargetSelectList(props: ImagePageTargetSelectListProps) {
  const { idPrefix, targets, selectedTarget, onSelectTarget } = props;

  return (
    <RadioGroup
      className="grid min-w-0 gap-0"
      value={selectedTarget?.id ?? ""}
      onValueChange={(id) => {
        const target = targets.find((entry) => entry.id === id);
        if (target) {
          onSelectTarget(target);
        }
      }}
    >
      <SurfaceSummaryCardSelectRowList>
        {targets.map((target) => {
          const inputId = `${idPrefix}-${target.id}`;
          const TargetIcon = imagePageTargetTablerIcon(target.kind);
          const selected = selectedTarget?.id === target.id;

          return (
            <SurfaceSummaryCardSelectRow key={target.id} htmlFor={inputId} selected={selected}>
              <RadioGroupItem id={inputId} value={target.id} />
              <SurfaceSummaryCardIconBox>
                <TargetIcon aria-hidden stroke={1.5} />
              </SurfaceSummaryCardIconBox>
              <SurfaceSummaryCardIconRowCopy>
                <SurfaceSummaryCardTitle>{formatImagePageTargetPrimaryLabel(target)}</SurfaceSummaryCardTitle>
                <SurfaceSummaryCardMeta>{formatImagePageTargetKindLabel(target)}</SurfaceSummaryCardMeta>
              </SurfaceSummaryCardIconRowCopy>
              <SurfaceSummaryCardOptionRowChevron aria-hidden>
                <IconChevronRight stroke={1.5} />
              </SurfaceSummaryCardOptionRowChevron>
            </SurfaceSummaryCardSelectRow>
          );
        })}
      </SurfaceSummaryCardSelectRowList>
    </RadioGroup>
  );
}

type ImagePageTargetScanListSectionProps = {
  idPrefix: string;
  targets: ImagePageTarget[];
  scanPending: boolean;
  scanError: string | null;
  pageScanned: boolean;
  onRescan: () => void;
  selectedTarget: ImagePageTarget | null;
  onSelectTarget: (target: ImagePageTarget) => void;
};

function ImagePageTargetScanListHeader(props: { scanPending: boolean; onRescan: () => void }) {
  const { scanPending, onRescan } = props;

  return (
    <SurfaceSummaryCardScanListSectionHeader>
      <SurfaceSummaryCardScanListSectionLabel>{IMAGE_TARGET_STEP_ON_PAGE}</SurfaceSummaryCardScanListSectionLabel>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        disabled={scanPending}
        onClick={onRescan}
        aria-label="Refresh list"
      >
        {scanPending ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
      </Button>
    </SurfaceSummaryCardScanListSectionHeader>
  );
}

function ImagePageTargetScanListMessages(props: {
  scanError: string | null;
  scanPending: boolean;
  pageScanned: boolean;
  targetCount: number;
}) {
  const { scanError, scanPending, pageScanned, targetCount } = props;

  return (
    <>
      {scanError ? <SurfaceSummaryCardScanListError>{scanError}</SurfaceSummaryCardScanListError> : null}
      {scanPending && targetCount === 0 ? (
        <SurfaceSummaryCardScanListStatus>
          <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
          {IMAGE_TARGET_STEP_SCAN_PENDING}
        </SurfaceSummaryCardScanListStatus>
      ) : null}
      {pageScanned && targetCount === 0 && !scanPending ? (
        <SurfaceSummaryCardScanListStatus>{IMAGE_TARGET_STEP_EMPTY}</SurfaceSummaryCardScanListStatus>
      ) : null}
    </>
  );
}

export function ImagePageTargetScanListSection(props: ImagePageTargetScanListSectionProps) {
  const { idPrefix, targets, scanPending, scanError, pageScanned, onRescan, selectedTarget, onSelectTarget } = props;
  const hasListRows = targets.length > 0;

  if (!pageScanned && !scanPending && !scanError) {
    return null;
  }

  return (
    <SurfaceSummaryCardScanListSection>
      {pageScanned && (hasListRows || scanPending) ? (
        <ImagePageTargetScanListHeader onRescan={onRescan} scanPending={scanPending} />
      ) : null}
      <ImagePageTargetScanListMessages
        pageScanned={pageScanned}
        scanError={scanError}
        scanPending={scanPending}
        targetCount={targets.length}
      />
      {hasListRows ? (
        <ImagePageTargetSelectList
          idPrefix={idPrefix}
          onSelectTarget={onSelectTarget}
          selectedTarget={selectedTarget}
          targets={targets}
        />
      ) : null}
    </SurfaceSummaryCardScanListSection>
  );
}
