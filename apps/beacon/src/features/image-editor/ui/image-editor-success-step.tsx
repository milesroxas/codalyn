import { CircleCheck } from "lucide-react";
import {
  IMAGE_UPLOAD_CMS_DESIGNER_REFRESH_HINT,
  IMAGE_UPLOAD_CMS_DESIGNER_REFRESH_READY,
  IMAGE_UPLOAD_SUCCESS_BACK_HOME_LABEL,
  IMAGE_UPLOAD_SUCCESS_TITLE,
  IMAGE_UPLOAD_SUCCESS_UPLOAD_ANOTHER_LABEL,
} from "@/shared/lib/beacon-feature-route-copy";
import { useDesignerViewReturnDetect } from "@/shared/lib/use-designer-view-return-detect";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";

export type ImageEditorSuccessStepProps = {
  message: string;
  showCmsDesignerRefreshHint: boolean;
  onUploadAnother: () => void;
  onBackHome: () => void;
};

export function ImageEditorSuccessStep(props: ImageEditorSuccessStepProps) {
  const { message, showCmsDesignerRefreshHint, onUploadAnother, onBackHome } = props;
  const designerViewReturned = useDesignerViewReturnDetect(showCmsDesignerRefreshHint);

  return (
    <Empty data-slot="image_upload_success" tone="successPanel">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CircleCheck aria-hidden />
        </EmptyMedia>
        <EmptyTitle>{IMAGE_UPLOAD_SUCCESS_TITLE}</EmptyTitle>
        <EmptyDescription>{message}</EmptyDescription>
      </EmptyHeader>
      {showCmsDesignerRefreshHint ? (
        <EmptyContent layout="hint">
          <Alert variant="info">
            <AlertDescription>
              {designerViewReturned ? IMAGE_UPLOAD_CMS_DESIGNER_REFRESH_READY : IMAGE_UPLOAD_CMS_DESIGNER_REFRESH_HINT}
            </AlertDescription>
          </Alert>
        </EmptyContent>
      ) : null}
      <EmptyContent layout="actions">
        <Button type="button" className="w-full" onClick={onUploadAnother}>
          {IMAGE_UPLOAD_SUCCESS_UPLOAD_ANOTHER_LABEL}
        </Button>
        <Button type="button" variant="outline" className="w-full" onClick={onBackHome}>
          {IMAGE_UPLOAD_SUCCESS_BACK_HOME_LABEL}
        </Button>
      </EmptyContent>
    </Empty>
  );
}
