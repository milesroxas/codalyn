import type { DragEvent, ReactNode, TransitionEvent } from "react";

import { assetBaseNameFromFileName } from "@/features/image-editor/lib/sanitize-asset-base-name";
import type { ImageDissolveState } from "@/features/image-editor/model/use-image-dissolve-transition";
import {
  EmptyImageSourceSection,
  IncomingDissolvePreview,
  OUTGOING_FADE_CLASS,
} from "@/features/image-editor/ui/image-editor-source-sections";
import { cn } from "@/shared/lib/utils";

type ImageEditorDissolveBranchProps = {
  dissolve: ImageDissolveState;
  showIncomingPreview: boolean;
  beginOutgoingFade: boolean;
  incomingEnter: boolean;
  loadedEditor: ReactNode;
  dropZoneLabelClass: string;
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
    dropZoneLabelClass,
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
      dropZoneLabelClass={dropZoneLabelClass}
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
          "flex min-w-0 flex-col gap-3",
          OUTGOING_FADE_CLASS,
          beginOutgoingFade ? "pointer-events-none opacity-0 delay-[160ms]" : "opacity-100 delay-0"
        )}
        onTransitionEnd={handleOutgoingFadeComplete}
      >
        {loadedEditor ? loadedEditor : <div className="px-4 pt-4">{emptyOrDefault}</div>}
      </div>
    );
  }

  if (dissolve.phase !== "dissolving") {
    return null;
  }

  return (
    <div className="mx-4 mt-4 rounded-sm bg-background/80 p-3 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.55)] ring-1 ring-foreground/10 backdrop-blur-sm">
      <IncomingDissolvePreview
        entered={incomingEnter}
        fileBaseName={assetBaseNameFromFileName(dissolve.incomingFile.name)}
        imageUrl={dissolve.incomingUrl}
        onEntranceComplete={finishDissolve}
      />
    </div>
  );
}
