import { imagePageTargetTablerIcon } from "@/features/image-editor/lib/image-editor-page-target-icon";
import {
  formatImagePageTargetKindLabel,
  formatImagePageTargetPrimaryLabel,
} from "@/features/image-editor/lib/image-editor-target-surface-label";
import type { ImagePageTarget } from "@/features/image-editor/lib/scan-image-targets-on-page";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import {
  SurfaceSummaryCardIconBox,
  SurfaceSummaryCardIconRowCopy,
  SurfaceSummaryCardMeta,
  SurfaceSummaryCardSelectRow,
  SurfaceSummaryCardSelectRowControl,
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
      <SurfaceSummaryCardSelectRowList density="compact">
        {targets.map((target) => {
          const inputId = `${idPrefix}-${target.id}`;
          const TargetIcon = imagePageTargetTablerIcon(target.kind);
          const selected = selectedTarget?.id === target.id;

          return (
            <SurfaceSummaryCardSelectRow key={target.id} density="compact" htmlFor={inputId} selected={selected}>
              <SurfaceSummaryCardIconBox density="compact">
                <TargetIcon aria-hidden stroke={1.5} />
              </SurfaceSummaryCardIconBox>
              <SurfaceSummaryCardIconRowCopy>
                <SurfaceSummaryCardTitle density="compact">
                  {formatImagePageTargetPrimaryLabel(target)}
                </SurfaceSummaryCardTitle>
                <SurfaceSummaryCardMeta>{formatImagePageTargetKindLabel(target)}</SurfaceSummaryCardMeta>
              </SurfaceSummaryCardIconRowCopy>
              <SurfaceSummaryCardSelectRowControl>
                <RadioGroupItem id={inputId} value={target.id} />
              </SurfaceSummaryCardSelectRowControl>
            </SurfaceSummaryCardSelectRow>
          );
        })}
      </SurfaceSummaryCardSelectRowList>
    </RadioGroup>
  );
}
