import type { DragEvent, ReactNode, RefObject, TransitionEvent } from "react";

import type { ImageDissolveState } from "@/features/image-editor/model/use-image-dissolve-transition";
import { ImageEditorDissolveBranch } from "@/features/image-editor/ui/image-editor-dissolve-branch";
import { EmptyImageSourceSection } from "@/features/image-editor/ui/image-editor-source-sections";

export type ImageEditorWorkspaceProps = {
  fileInputRef: RefObject<HTMLInputElement | null>;
  fileInputId: string;
  queueFile: (file: File | undefined) => void;
  imageSrc: string | null;
  loadedEditor: ReactNode;
  emptyStateContent?: ReactNode;
  dragActive: boolean;
  handleDrag: (e: DragEvent) => void;
  handleDragState: (e: DragEvent, active: boolean) => void;
  handleDrop: (e: DragEvent) => void;
  dissolve: ImageDissolveState;
  dissolving: boolean;
  showIncomingPreview: boolean;
  beginOutgoingFade: boolean;
  incomingEnter: boolean;
  handleOutgoingFadeComplete: (e: TransitionEvent<HTMLDivElement>) => void;
  finishDissolve: () => void;
};

export function ImageEditorWorkspace(props: ImageEditorWorkspaceProps) {
  const {
    fileInputRef,
    fileInputId,
    queueFile,
    imageSrc,
    loadedEditor,
    emptyStateContent,
    dragActive,
    handleDrag,
    handleDragState,
    handleDrop,
    dissolve,
    dissolving,
    showIncomingPreview,
    beginOutgoingFade,
    incomingEnter,
    handleOutgoingFadeComplete,
    finishDissolve,
  } = props;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <input
        ref={fileInputRef}
        disabled={dissolving}
        id={fileInputId}
        aria-label="Choose image file"
        className="sr-only"
        type="file"
        accept="image/*"
        onChange={(e) => queueFile(e.target.files?.[0])}
      />
      {dissolving ? (
        <ImageEditorDissolveBranch
          beginOutgoingFade={beginOutgoingFade}
          dissolve={dissolve}
          dragActive={dragActive}
          emptyStateWhenNoImage={emptyStateContent}
          fileInputId={fileInputId}
          finishDissolve={finishDissolve}
          handleDrag={handleDrag}
          handleDragState={handleDragState}
          handleDrop={handleDrop}
          handleOutgoingFadeComplete={handleOutgoingFadeComplete}
          incomingEnter={incomingEnter}
          loadedEditor={loadedEditor}
          showIncomingPreview={showIncomingPreview}
        />
      ) : !imageSrc ? (
        (emptyStateContent ?? (
          <EmptyImageSourceSection
            dragActive={dragActive}
            fileInputId={fileInputId}
            handleDrag={handleDrag}
            handleDragState={handleDragState}
            handleDrop={handleDrop}
          />
        ))
      ) : (
        loadedEditor
      )}
    </div>
  );
}
