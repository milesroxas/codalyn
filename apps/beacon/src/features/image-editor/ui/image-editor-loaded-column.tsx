import type { ReactNode, RefObject } from "react";
import type { ImageEditorFlowStep } from "@/features/image-editor/lib/image-editor-flow-step";
import { LoadedImageSourceSection } from "@/features/image-editor/ui/image-editor-source-sections";

type ImageEditorLoadedColumnProps = {
  flowStep: ImageEditorFlowStep;
  fileBaseName: string;
  busy: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  children: ReactNode;
};

export function ImageEditorLoadedColumn(props: ImageEditorLoadedColumnProps) {
  const { flowStep, fileBaseName, busy, fileInputRef, children } = props;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {flowStep === "save" ? (
        <LoadedImageSourceSection busy={busy} fileBaseName={fileBaseName} fileInputRef={fileInputRef} />
      ) : null}
      {children}
    </div>
  );
}
