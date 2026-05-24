import {
  IconChevronRight,
  IconCircleCheck,
  IconDeviceDesktop,
  IconExternalLink,
  IconInfoCircle,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import {
  IMAGE_UPLOAD_CMS_DESIGNER_REFRESH_HINT,
  IMAGE_UPLOAD_CMS_DESIGNER_REFRESH_READY,
  IMAGE_UPLOAD_SUCCESS_BACK_HOME_LABEL,
  IMAGE_UPLOAD_SUCCESS_GO_TO_CMS_LABEL,
  IMAGE_UPLOAD_SUCCESS_NEXT_STEPS_LABEL,
  IMAGE_UPLOAD_SUCCESS_RETURN_TO_DESIGNER_LABEL,
  IMAGE_UPLOAD_SUCCESS_TITLE,
  IMAGE_UPLOAD_SUCCESS_UPLOAD_ANOTHER_LABEL,
} from "@/shared/lib/beacon-feature-route-copy";
import { useDesignerViewReturnDetect } from "@/shared/lib/use-designer-view-return-detect";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { Separator } from "@/shared/ui/separator";
import {
  SurfaceSummaryCardIconBox,
  SurfaceSummaryCardOptionRow,
  SurfaceSummaryCardOptionRowChevron,
  SurfaceSummaryCardOptionRowCopy,
  SurfaceSummaryCardOptionRows,
  SurfaceSummaryCardPanelSectionLabel,
  SurfaceSummaryCardTitle,
} from "@/shared/ui/surface-summary-card";

export type ImageEditorSuccessStepProps = {
  message: string;
  showCmsDesignerRefreshHint: boolean;
  onUploadAnother: () => void;
  onBackHome: () => void;
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

export function ImageEditorSuccessStep(props: ImageEditorSuccessStepProps) {
  const { message, showCmsDesignerRefreshHint, onUploadAnother, onBackHome } = props;
  const designerViewReturned = useDesignerViewReturnDetect(showCmsDesignerRefreshHint);

  return (
    <Empty data-slot="image_upload_success" tone="successPanel">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <IconCircleCheck aria-hidden stroke={1.5} />
        </EmptyMedia>
        <EmptyTitle>{IMAGE_UPLOAD_SUCCESS_TITLE}</EmptyTitle>
        <EmptyDescription>{formatImageUploadSuccessDescription(message)}</EmptyDescription>
      </EmptyHeader>
      {showCmsDesignerRefreshHint ? (
        <EmptyContent layout="hint">
          <Alert variant="info">
            <IconInfoCircle aria-hidden stroke={1.5} />
            <AlertDescription>
              {designerViewReturned ? IMAGE_UPLOAD_CMS_DESIGNER_REFRESH_READY : IMAGE_UPLOAD_CMS_DESIGNER_REFRESH_HINT}
            </AlertDescription>
          </Alert>
          {designerViewReturned ? null : (
            <>
              <Separator />
              <SurfaceSummaryCardPanelSectionLabel>
                {IMAGE_UPLOAD_SUCCESS_NEXT_STEPS_LABEL}
              </SurfaceSummaryCardPanelSectionLabel>
              <SurfaceSummaryCardOptionRows>
                <SurfaceSummaryCardOptionRow type="button" onClick={dismissExtensionForWebflowNavigation}>
                  <SurfaceSummaryCardIconBox>
                    <IconExternalLink aria-hidden stroke={1.5} />
                  </SurfaceSummaryCardIconBox>
                  <SurfaceSummaryCardOptionRowCopy>
                    <SurfaceSummaryCardTitle>{IMAGE_UPLOAD_SUCCESS_GO_TO_CMS_LABEL}</SurfaceSummaryCardTitle>
                  </SurfaceSummaryCardOptionRowCopy>
                  <SurfaceSummaryCardOptionRowChevron aria-hidden>
                    <IconChevronRight stroke={1.5} />
                  </SurfaceSummaryCardOptionRowChevron>
                </SurfaceSummaryCardOptionRow>
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
              </SurfaceSummaryCardOptionRows>
            </>
          )}
        </EmptyContent>
      ) : null}
      <EmptyContent layout="actions">
        <Button type="button" className="w-full" onClick={onUploadAnother}>
          {IMAGE_UPLOAD_SUCCESS_UPLOAD_ANOTHER_LABEL}
        </Button>
        <Button type="button" variant="link" onClick={onBackHome}>
          {IMAGE_UPLOAD_SUCCESS_BACK_HOME_LABEL}
        </Button>
      </EmptyContent>
    </Empty>
  );
}
