import type { DragEvent } from "react";

import { ImageEditorDropzone } from "@/features/image-editor/ui/image-editor-dropzone";
import { beaconPanelContainClass } from "@/shared/lib/beacon-app-route-surface";
import { cn } from "@/shared/lib/utils";

const OUTGOING_FADE_CLASS = "transition-opacity duration-[380ms] ease-out";

const INCOMING_STAGGER_BASE_CLASS = "transition-opacity duration-300 ease-out";

export { OUTGOING_FADE_CLASS };

export function IncomingDissolvePreview(props: {
  imageUrl: string;
  fileBaseName: string;
  entered: boolean;
  onEntranceComplete?: () => void;
}) {
  const { imageUrl, fileBaseName, entered, onEntranceComplete } = props;
  return (
    <div className={cn(beaconPanelContainClass, "flex flex-col gap-3")}>
      <p
        className={cn(
          INCOMING_STAGGER_BASE_CLASS,
          "min-w-0 truncate text-xs leading-snug text-muted-foreground",
          entered ? "opacity-100 [transition-delay:0ms]" : "opacity-0"
        )}
        title={fileBaseName}
      >
        <span className="font-medium text-foreground">Source: </span>
        {fileBaseName}
      </p>
      <div
        className={cn(
          INCOMING_STAGGER_BASE_CLASS,
          "aspect-video overflow-hidden rounded-sm bg-muted/50 ring-1 ring-foreground/10",
          entered ? "opacity-100 [transition-delay:90ms]" : "opacity-0 [transition-delay:0ms]"
        )}
        onTransitionEnd={(e) => {
          if (e.target !== e.currentTarget || e.propertyName !== "opacity") {
            return;
          }
          onEntranceComplete?.();
        }}
      >
        <img alt="" className="size-full object-contain" decoding="async" src={imageUrl} />
      </div>
    </div>
  );
}

export function EmptyImageSourceSection(props: {
  fileInputId: string;
  dragActive: boolean;
  handleDrag: (e: DragEvent) => void;
  handleDragState: (e: DragEvent, active: boolean) => void;
  handleDrop: (e: DragEvent) => void;
}) {
  const { fileInputId, dragActive, handleDrag, handleDragState, handleDrop } = props;
  return (
    <ImageEditorDropzone
      fileInputId={fileInputId}
      dragActive={dragActive}
      onDragEnter={(e) => handleDragState(e, true)}
      onDragLeave={(e) => handleDragState(e, false)}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    />
  );
}
