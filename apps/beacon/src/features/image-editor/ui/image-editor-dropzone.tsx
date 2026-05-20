import { cva, type VariantProps } from "class-variance-authority";
import { FileImage, Upload } from "lucide-react";
import type { DragEvent } from "react";

import { cn } from "@/shared/lib/utils";
import { buttonVariants } from "@/shared/ui/button";

export const imageDropzoneVariants = cva(
  "flex aspect-video w-full cursor-pointer items-center justify-center rounded-sm border-2 border-dashed p-4 transition-colors",
  {
    variants: {
      state: {
        idle: "border-border bg-muted/30",
        active: "border-primary bg-accent/40",
      },
    },
    defaultVariants: {
      state: "idle",
    },
  }
);

type ImageEditorDropzoneProps = VariantProps<typeof imageDropzoneVariants> & {
  fileInputId: string;
  dragActive?: boolean;
  onDragEnter: (e: DragEvent) => void;
  onDragLeave: (e: DragEvent) => void;
  onDragOver: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
};

export function ImageEditorDropzone(props: ImageEditorDropzoneProps) {
  const { fileInputId, dragActive, onDragEnter, onDragLeave, onDragOver, onDrop } = props;
  return (
    <label
      className={cn(imageDropzoneVariants({ state: dragActive ? "active" : "idle" }))}
      htmlFor={fileInputId}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <span className="flex flex-col items-center gap-2 text-center">
        <Upload aria-hidden className="size-8 text-muted-foreground" />
        <span className="text-muted-foreground text-xs">Drop an image, or browse.</span>
        <span
          className={cn(buttonVariants({ variant: "default", size: "sm" }), "pointer-events-none inline-flex gap-1.5")}
        >
          <FileImage aria-hidden className="size-3.5" />
          Browse files
        </span>
      </span>
    </label>
  );
}
