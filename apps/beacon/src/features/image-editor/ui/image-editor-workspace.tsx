import type { DragEvent, ReactNode, RefObject, TransitionEvent } from "react";

import type { ImageDissolveState } from "@/features/image-editor/model/use-image-dissolve-transition";
import { ImageEditorDissolveBranch } from "@/features/image-editor/ui/image-editor-dissolve-branch";
import { EmptyImageSourceSection } from "@/features/image-editor/ui/image-editor-source-sections";
import { ScrollArea } from "@/shared/ui/scroll-area";

export type ImageEditorWorkspaceProps = {
  fileInputRef: RefObject<HTMLInputElement | null>;
  fileInputId: string;
  queueFile: (file: File | undefined) => void;
  imageSrc: string | null;
  loadedEditor: ReactNode;
  emptyStateContent?: ReactNode;
  dropZoneLabelClass: string;
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
    dropZoneLabelClass,
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
    <ScrollArea className="h-full min-h-0 min-w-0 flex-1">
      <div className="flex min-w-0 flex-col gap-0 pb-1">
        <section className="flex min-w-0 flex-col gap-3">
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
            <div className="relative flex min-w-0 flex-col gap-3">
              <ImageEditorDissolveBranch
                beginOutgoingFade={beginOutgoingFade}
                dissolve={dissolve}
                dropZoneLabelClass={dropZoneLabelClass}
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
            </div>
          ) : !imageSrc ? (
            <div className="px-4 pt-4">
              {emptyStateContent ?? (
                <EmptyImageSourceSection
                  dropZoneLabelClass={dropZoneLabelClass}
                  fileInputId={fileInputId}
                  handleDrag={handleDrag}
                  handleDragState={handleDragState}
                  handleDrop={handleDrop}
                />
              )}
            </div>
          ) : null}
        </section>

        {imageSrc && !dissolving ? (
          <div key={imageSrc} className="min-w-0">
            {loadedEditor}
          </div>
        ) : null}
      </div>
    </ScrollArea>
  );
}
