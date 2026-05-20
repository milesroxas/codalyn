import type { ReactNode, TransitionEvent } from "react";
import type { ImageEditorFlowStep } from "@/features/image-editor/lib/image-editor-flow-step";
import {
  imageEditorStepEnterTransitionClass,
  imageEditorStepExitTransitionClass,
  isImageEditorStepExitTransitionEnd,
} from "@/features/image-editor/lib/image-editor-step-transition";
import { useImageEditorStepEnter } from "@/features/image-editor/model/use-image-editor-step-enter";
import { beaconPanelContainClass } from "@/shared/lib/beacon-app-route-surface";
import { cn } from "@/shared/lib/utils";

type ImageEditorLoadedColumnProps = {
  flowStep: ImageEditorFlowStep;
  stepExitFade: boolean;
  onStepExitTransitionEnd: (e: TransitionEvent<HTMLDivElement>) => void;
  children: ReactNode;
};

export function ImageEditorLoadedColumn(props: ImageEditorLoadedColumnProps) {
  const { flowStep, stepExitFade, onStepExitTransitionEnd, children } = props;
  const entered = useImageEditorStepEnter(flowStep);

  const handleExitTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (!isImageEditorStepExitTransitionEnd(e, stepExitFade)) {
      return;
    }
    onStepExitTransitionEnd(e);
  };

  if (flowStep === "position") {
    return (
      <div className={cn(beaconPanelContainClass, "flex flex-col gap-3")}>
        <div className={imageEditorStepExitTransitionClass(stepExitFade)} onTransitionEnd={handleExitTransitionEnd}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(beaconPanelContainClass, "flex flex-col gap-3")}>
      <div className={imageEditorStepEnterTransitionClass(entered)}>{children}</div>
    </div>
  );
}
