import { IconPhoto } from "@tabler/icons-react";
import { FileImage, Upload } from "lucide-react";
import type { DragEvent, RefObject } from "react";

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

const OUTGOING_FADE_CLASS = "transition-opacity duration-[380ms] ease-out will-change-[opacity] transform-gpu";

const INCOMING_STAGGER_BASE_CLASS =
  "transition-[opacity,transform] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[opacity,transform] transform-gpu duration-300";

export { OUTGOING_FADE_CLASS };

export function IncomingDissolvePreview(props: {
  imageUrl: string;
  fileBaseName: string;
  entered: boolean;
  onEntranceComplete?: () => void;
}) {
  const { imageUrl, fileBaseName, entered, onEntranceComplete } = props;
  return (
    <div className="flex flex-col gap-3">
      <p
        className={cn(
          INCOMING_STAGGER_BASE_CLASS,
          "text-muted-foreground min-w-0 truncate text-xs leading-snug",
          entered ? "translate-y-0 opacity-100 [transition-delay:0ms]" : "translate-y-2 opacity-0"
        )}
        title={fileBaseName}
      >
        <span className="text-foreground font-medium">Source: </span>
        {fileBaseName}
      </p>
      <div
        className={cn(
          INCOMING_STAGGER_BASE_CLASS,
          "aspect-video overflow-hidden rounded-sm bg-muted/50 ring-1 ring-foreground/10",
          entered
            ? "translate-y-0 opacity-100 [transition-delay:90ms]"
            : "translate-y-3 opacity-0 [transition-delay:0ms]"
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

function DropzoneCard(props: {
  className: string;
  fileInputId: string;
  onDragEnter: (e: DragEvent) => void;
  onDragLeave: (e: DragEvent) => void;
  onDragOver: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
}) {
  const { className, fileInputId, onDragEnter, onDragLeave, onDragOver, onDrop } = props;
  return (
    <label
      className={className}
      htmlFor={fileInputId}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <span className="flex flex-col items-center gap-2 text-center">
        <Upload aria-hidden className="size-8 text-muted-foreground" />
        <span className="text-muted-foreground text-xs">Drop an image, or browse.</span>
        <span className="inline-flex items-center gap-1.5 rounded-sm border border-transparent bg-primary px-2.5 py-1 text-[0.8rem] font-medium text-primary-foreground">
          <FileImage aria-hidden className="size-3.5" />
          Browse files
        </span>
      </span>
    </label>
  );
}

export function EmptyImageSourceSection(props: {
  fileInputId: string;
  dropZoneLabelClass: string;
  handleDrag: (e: DragEvent) => void;
  handleDragState: (e: DragEvent, active: boolean) => void;
  handleDrop: (e: DragEvent) => void;
}) {
  const { fileInputId, dropZoneLabelClass, handleDrag, handleDragState, handleDrop } = props;
  return (
    <DropzoneCard
      className={dropZoneLabelClass}
      fileInputId={fileInputId}
      onDragEnter={(e) => handleDragState(e, true)}
      onDragLeave={(e) => handleDragState(e, false)}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    />
  );
}

export function LoadedImageSourceSection(props: {
  fileBaseName: string;
  busy: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
}) {
  const { fileBaseName, busy, fileInputRef } = props;
  return (
    <div className="flex min-h-0 min-w-0 items-center gap-2 border-b border-border bg-muted/40 py-1.5 pr-1.5 pl-3">
      <IconPhoto aria-hidden className="size-3.5 shrink-0 text-muted-foreground" stroke={1.5} />
      <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground" title={fileBaseName}>
        {fileBaseName}
      </p>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={busy}
        aria-label="Change image"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload aria-hidden className="size-3.5" />
      </Button>
    </div>
  );
}
