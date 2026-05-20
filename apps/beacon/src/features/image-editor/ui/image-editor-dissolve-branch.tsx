import type { DragEvent, ReactNode, TransitionEvent } from "react";

import { assetBaseNameFromFileName } from "@/features/image-editor/lib/sanitize-asset-base-name";
import type { ImageDissolveState } from "@/features/image-editor/model/use-image-dissolve-transition";
import {
  EmptyImageSourceSection,
  IncomingDissolvePreview,
  OUTGOING_FADE_CLASS,
} from "@/features/image-editor/ui/image-editor-source-sections";
import { beaconPanelContainClass } from "@/shared/lib/beacon-app-route-surface";
import { cn } from "@/shared/lib/utils";

type ImageEditorDissolveBranchProps = {
  dissolve: ImageDissolveState;
  showIncomingPreview: boolean;
  beginOutgoingFade: boolean;
  incomingEnter: boolean;
  loadedEditor: ReactNode;
  dragActive: boolean;
  fileInputId: string;
  handleDrag: (e: DragEvent) => void;
  handleDragState: (e: DragEvent, active: boolean) => void;
  handleDrop: (e: DragEvent) => void;
  handleOutgoingFadeComplete: (e: TransitionEvent<HTMLDivElement>) => void;
  finishDissolve: () => void;
  /** When `loadedEditor` is null, shown instead of the default drop zone (e.g. multistep upload UI). */
  emptyStateWhenNoImage?: ReactNode;
};

export function ImageEditorDissolveBranch(props: ImageEditorDissolveBranchProps) {
  const {
    dissolve,
    showIncomingPreview,
    beginOutgoingFade,
    incomingEnter,
    loadedEditor,
    dragActive,
    fileInputId,
    handleDrag,
    handleDragState,
    handleDrop,
    handleOutgoingFadeComplete,
    finishDissolve,
    emptyStateWhenNoImage,
  } = props;

  const emptyOrDefault = emptyStateWhenNoImage ?? (
    <EmptyImageSourceSection
      dragActive={dragActive}
      fileInputId={fileInputId}
      handleDrag={handleDrag}
      handleDragState={handleDragState}
      handleDrop={handleDrop}
    />
  );

  if (!showIncomingPreview) {
    return (
      <div
        className={cn(
          beaconPanelContainClass,
          "flex flex-col gap-3",
          OUTGOING_FADE_CLASS,
          beginOutgoingFade ? "pointer-events-none opacity-0 delay-[160ms]" : "opacity-100 delay-0"
        )}
        onTransitionEnd={handleOutgoingFadeComplete}
      >
        {loadedEditor ? loadedEditor : emptyOrDefault}
      </div>
    );
  }

  if (dissolve.phase !== "dissolving") {
    return null;
  }

  return (
    <div
      className={cn(
        beaconPanelContainClass,
        "rounded-sm bg-background/80 p-3 ring-1 ring-foreground/10 backdrop-blur-sm"
      )}
    >
      <IncomingDissolvePreview
        entered={incomingEnter}
        fileBaseName={assetBaseNameFromFileName(dissolve.incomingFile.name)}
        imageUrl={dissolve.incomingUrl}
        onEntranceComplete={finishDissolve}
      />
    </div>
  );
}
