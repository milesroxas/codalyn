import {
  IconChevronRight,
  IconCircleCheck,
  IconDeviceDesktop,
  IconInfoCircle,
  IconPhoto,
  IconPointer,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import {
  IMAGE_UPLOAD_CMS_DESIGNER_REFRESH_HINT,
  IMAGE_UPLOAD_CMS_DESIGNER_REFRESH_READY,
  IMAGE_UPLOAD_SUCCESS_RESELECT_TARGET_HINT,
  IMAGE_UPLOAD_SUCCESS_RESELECT_TARGET_LABEL,
  IMAGE_UPLOAD_SUCCESS_RETURN_TO_DESIGNER_LABEL,
  IMAGE_UPLOAD_SUCCESS_TITLE,
  IMAGE_UPLOAD_SUCCESS_UPLOAD_ANOTHER_HINT,
  IMAGE_UPLOAD_SUCCESS_UPLOAD_ANOTHER_LABEL,
} from "@/shared/lib/beacon-feature-route-copy";
import { useDesignerViewReturnDetect } from "@/shared/lib/use-designer-view-return-detect";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { Separator } from "@/shared/ui/separator";
import {
  SurfaceSummaryCardIconBox,
  SurfaceSummaryCardMeta,
  SurfaceSummaryCardOptionRow,
  SurfaceSummaryCardOptionRowChevron,
  SurfaceSummaryCardOptionRowCopy,
  SurfaceSummaryCardOptionRows,
  SurfaceSummaryCardTitle,
} from "@/shared/ui/surface-summary-card";

export type ImageEditorSuccessStepProps = {
  message: string;
  showCmsDesignerRefreshHint: boolean;
  showReselectTarget: boolean;
  onUploadAnother: () => void;
  onReselectTarget: () => void;
};

const CMS_FIELD_SUCCESS_MESSAGE_PATTERN = /^Updated CMS field [\u201c"](.+?)[\u201d"]\.$/;

function formatImageUploadSuccessDescription(message: string): ReactNode {
  const fieldName = CMS_FIELD_SUCCESS_MESSAGE_PATTERN.exec(message)?.[1];
  if (fieldName == null) {
    return message;
  }

  return (
    <>
      Updated CMS field <strong>{fieldName}</strong>.
    </>
  );
}

function dismissExtensionForWebflowNavigation(): void {
  if (typeof webflow.closeExtension === "function") {
    void webflow.closeExtension();
  }
}

function ImageEditorSuccessCmsRefreshAlert(props: { designerViewReturned: boolean }) {
  return (
    <Alert variant="info">
      <IconInfoCircle aria-hidden stroke={1.5} />
      <AlertDescription>
        {props.designerViewReturned ? IMAGE_UPLOAD_CMS_DESIGNER_REFRESH_READY : IMAGE_UPLOAD_CMS_DESIGNER_REFRESH_HINT}
      </AlertDescription>
    </Alert>
  );
}

function ImageEditorSuccessActionRows(props: {
  showReturnToDesigner: boolean;
  showReselectTarget: boolean;
  onUploadAnother: () => void;
  onReselectTarget: () => void;
}) {
  const { showReturnToDesigner, showReselectTarget, onUploadAnother, onReselectTarget } = props;

  return (
    <SurfaceSummaryCardOptionRows>
      <SurfaceSummaryCardOptionRow type="button" onClick={onUploadAnother}>
        <SurfaceSummaryCardIconBox>
          <IconPhoto aria-hidden stroke={1.5} />
        </SurfaceSummaryCardIconBox>
        <SurfaceSummaryCardOptionRowCopy>
          <SurfaceSummaryCardTitle>{IMAGE_UPLOAD_SUCCESS_UPLOAD_ANOTHER_LABEL}</SurfaceSummaryCardTitle>
          <SurfaceSummaryCardMeta emphasis="hint">{IMAGE_UPLOAD_SUCCESS_UPLOAD_ANOTHER_HINT}</SurfaceSummaryCardMeta>
        </SurfaceSummaryCardOptionRowCopy>
        <SurfaceSummaryCardOptionRowChevron aria-hidden>
          <IconChevronRight stroke={1.5} />
        </SurfaceSummaryCardOptionRowChevron>
      </SurfaceSummaryCardOptionRow>
      {showReselectTarget ? (
        <SurfaceSummaryCardOptionRow type="button" onClick={onReselectTarget}>
          <SurfaceSummaryCardIconBox>
            <IconPointer aria-hidden stroke={1.5} />
          </SurfaceSummaryCardIconBox>
          <SurfaceSummaryCardOptionRowCopy>
            <SurfaceSummaryCardTitle>{IMAGE_UPLOAD_SUCCESS_RESELECT_TARGET_LABEL}</SurfaceSummaryCardTitle>
            <SurfaceSummaryCardMeta emphasis="hint">{IMAGE_UPLOAD_SUCCESS_RESELECT_TARGET_HINT}</SurfaceSummaryCardMeta>
          </SurfaceSummaryCardOptionRowCopy>
          <SurfaceSummaryCardOptionRowChevron aria-hidden>
            <IconChevronRight stroke={1.5} />
          </SurfaceSummaryCardOptionRowChevron>
        </SurfaceSummaryCardOptionRow>
      ) : null}
      {showReturnToDesigner ? (
        <SurfaceSummaryCardOptionRow type="button" onClick={dismissExtensionForWebflowNavigation}>
          <SurfaceSummaryCardIconBox>
            <IconDeviceDesktop aria-hidden stroke={1.5} />
          </SurfaceSummaryCardIconBox>
          <SurfaceSummaryCardOptionRowCopy>
            <SurfaceSummaryCardTitle>{IMAGE_UPLOAD_SUCCESS_RETURN_TO_DESIGNER_LABEL}</SurfaceSummaryCardTitle>
          </SurfaceSummaryCardOptionRowCopy>
          <SurfaceSummaryCardOptionRowChevron aria-hidden>
            <IconChevronRight stroke={1.5} />
          </SurfaceSummaryCardOptionRowChevron>
        </SurfaceSummaryCardOptionRow>
      ) : null}
    </SurfaceSummaryCardOptionRows>
  );
}

export function ImageEditorSuccessStep(props: ImageEditorSuccessStepProps) {
  const { message, showCmsDesignerRefreshHint, showReselectTarget, onUploadAnother, onReselectTarget } = props;
  const designerViewReturned = useDesignerViewReturnDetect(showCmsDesignerRefreshHint);
  const showReturnToDesigner = showCmsDesignerRefreshHint && !designerViewReturned;
  const showActionRows = !showCmsDesignerRefreshHint || !designerViewReturned;
  const showFollowUpContent = showCmsDesignerRefreshHint || showActionRows;

  return (
    <Empty data-slot="image_upload_success" tone="plain">
      <EmptyHeader width="full">
        <EmptyMedia variant="icon">
          <IconCircleCheck aria-hidden stroke={1.5} />
        </EmptyMedia>
        <EmptyTitle>{IMAGE_UPLOAD_SUCCESS_TITLE}</EmptyTitle>
        <EmptyDescription>{formatImageUploadSuccessDescription(message)}</EmptyDescription>
      </EmptyHeader>
      {showFollowUpContent ? (
        <EmptyContent layout="hint">
          {showCmsDesignerRefreshHint ? (
            <ImageEditorSuccessCmsRefreshAlert designerViewReturned={designerViewReturned} />
          ) : null}
          {showActionRows ? (
            <>
              {showCmsDesignerRefreshHint ? <Separator /> : null}
              <ImageEditorSuccessActionRows
                onUploadAnother={onUploadAnother}
                onReselectTarget={onReselectTarget}
                showReselectTarget={showReselectTarget}
                showReturnToDesigner={showReturnToDesigner}
              />
            </>
          ) : null}
        </EmptyContent>
      ) : null}
    </Empty>
  );
}
