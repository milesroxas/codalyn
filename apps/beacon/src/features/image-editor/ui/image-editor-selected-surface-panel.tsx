import type { PresetCrudScope } from "@codalyn/webflow-kit";
import { IconBox, IconChevronRight, IconComponents, IconFileStar, IconStack } from "@tabler/icons-react";

import type {
  PresetFormAddableScope,
  PresetFormExistingMatch,
} from "@/features/image-editor/lib/image-editor-preset-form-existing";
import { imageEditorPresetScopeDescription } from "@/features/image-editor/lib/image-editor-preset-scope-copy";
import type { ImagePageTarget } from "@/features/image-editor/lib/scan-image-targets-on-page";
import { ImagePageTargetSurfaceSummary } from "@/features/image-editor/ui/image-editor-page-target-surface-summary";
import {
  IMAGE_UPLOAD_PRESET_CREATE_INTRO,
  IMAGE_UPLOAD_PRESET_CREATE_SECTION_LABEL,
  IMAGE_UPLOAD_PRESET_CURRENT_SECTION_LABEL,
  IMAGE_UPLOAD_PRESET_EDIT_EXISTING_LABEL,
} from "@/shared/lib/beacon-feature-route-copy";
import { Button } from "@/shared/ui/button";
import {
  SurfaceSummaryCardIconBox,
  SurfaceSummaryCardIntro,
  SurfaceSummaryCardMeta,
  SurfaceSummaryCardNestedCard,
  SurfaceSummaryCardNestedCardCopy,
  SurfaceSummaryCardNestedCardList,
  SurfaceSummaryCardOptionRow,
  SurfaceSummaryCardOptionRowChevron,
  SurfaceSummaryCardOptionRowCopy,
  SurfaceSummaryCardOptionRows,
  SurfaceSummaryCardPanel,
  SurfaceSummaryCardPanelSection,
  SurfaceSummaryCardPanelSectionLabel,
  SurfaceSummaryCardTitle,
} from "@/shared/ui/surface-summary-card";

type ImageEditorSelectedSurfacePanelProps = {
  target: ImagePageTarget | null;
  discoveryPending?: boolean;
  existingPresets?: PresetFormExistingMatch[];
  addableScopes?: PresetFormAddableScope[];
  onEditPreset?: (match: PresetFormExistingMatch) => void;
  onAddScope?: (scope: PresetFormAddableScope["scope"]) => void;
};

function SelectedSurfaceSection(props: { target: ImagePageTarget | null; discoveryPending: boolean }) {
  const { target, discoveryPending } = props;

  return (
    <SurfaceSummaryCardPanelSection showDivider>
      <ImagePageTargetSurfaceSummary discoveryPending={discoveryPending} target={target} />
    </SurfaceSummaryCardPanelSection>
  );
}

function CurrentPresetSection(props: {
  existingPresets: PresetFormExistingMatch[];
  onEditPreset?: (match: PresetFormExistingMatch) => void;
}) {
  const { existingPresets, onEditPreset } = props;

  if (existingPresets.length === 0) {
    return null;
  }

  return (
    <SurfaceSummaryCardPanelSection showDivider>
      <SurfaceSummaryCardPanelSectionLabel>
        {IMAGE_UPLOAD_PRESET_CURRENT_SECTION_LABEL}
      </SurfaceSummaryCardPanelSectionLabel>
      <SurfaceSummaryCardNestedCardList>
        {existingPresets.map((match) => (
          <SurfaceSummaryCardNestedCard key={match.row.id}>
            <SurfaceSummaryCardIconBox>
              <IconFileStar aria-hidden stroke={1.5} />
            </SurfaceSummaryCardIconBox>
            <SurfaceSummaryCardNestedCardCopy>
              <SurfaceSummaryCardTitle>{match.displayName}</SurfaceSummaryCardTitle>
              <SurfaceSummaryCardMeta>{match.dimensionsLabel}</SurfaceSummaryCardMeta>
            </SurfaceSummaryCardNestedCardCopy>
            {onEditPreset ? (
              <Button type="button" size="xs" variant="outline" onClick={() => onEditPreset(match)}>
                {IMAGE_UPLOAD_PRESET_EDIT_EXISTING_LABEL}
              </Button>
            ) : null}
          </SurfaceSummaryCardNestedCard>
        ))}
      </SurfaceSummaryCardNestedCardList>
    </SurfaceSummaryCardPanelSection>
  );
}

function createPresetScopeIcon(scope: PresetCrudScope) {
  switch (scope) {
    case "site-default":
      return IconFileStar;
    case "element":
      return IconStack;
    case "component":
      return IconComponents;
    case "instance":
      return IconBox;
  }
}

function CreatePresetSection(props: {
  addableScopes: PresetFormAddableScope[];
  onAddScope?: (scope: PresetFormAddableScope["scope"]) => void;
}) {
  const { addableScopes, onAddScope } = props;

  if (addableScopes.length === 0) {
    return null;
  }

  return (
    <SurfaceSummaryCardPanelSection showDivider={false}>
      <SurfaceSummaryCardPanelSectionLabel>
        {IMAGE_UPLOAD_PRESET_CREATE_SECTION_LABEL}
      </SurfaceSummaryCardPanelSectionLabel>
      <SurfaceSummaryCardIntro>{IMAGE_UPLOAD_PRESET_CREATE_INTRO}</SurfaceSummaryCardIntro>
      <SurfaceSummaryCardOptionRows>
        {addableScopes.map((scopeOption) => {
          const ScopeIcon = createPresetScopeIcon(scopeOption.scope);
          return (
            <SurfaceSummaryCardOptionRow
              key={scopeOption.scope}
              disabled={!onAddScope}
              onClick={() => onAddScope?.(scopeOption.scope)}
            >
              <SurfaceSummaryCardIconBox>
                <ScopeIcon aria-hidden stroke={1.5} />
              </SurfaceSummaryCardIconBox>
              <SurfaceSummaryCardOptionRowCopy>
                <SurfaceSummaryCardTitle>{scopeOption.label}</SurfaceSummaryCardTitle>
                <SurfaceSummaryCardMeta>{imageEditorPresetScopeDescription(scopeOption.scope)}</SurfaceSummaryCardMeta>
              </SurfaceSummaryCardOptionRowCopy>
              <SurfaceSummaryCardOptionRowChevron aria-hidden>
                <IconChevronRight stroke={1.5} />
              </SurfaceSummaryCardOptionRowChevron>
            </SurfaceSummaryCardOptionRow>
          );
        })}
      </SurfaceSummaryCardOptionRows>
    </SurfaceSummaryCardPanelSection>
  );
}

export function ImageEditorSelectedSurfacePanel(props: ImageEditorSelectedSurfacePanelProps) {
  const {
    target,
    discoveryPending = false,
    existingPresets = [],
    addableScopes = [],
    onEditPreset,
    onAddScope,
  } = props;

  return (
    <SurfaceSummaryCardPanel>
      <SelectedSurfaceSection discoveryPending={discoveryPending} target={target} />
      <CurrentPresetSection existingPresets={existingPresets} onEditPreset={onEditPreset} />
      <CreatePresetSection addableScopes={addableScopes} onAddScope={onAddScope} />
    </SurfaceSummaryCardPanel>
  );
}
