import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import {
  BeaconFeatureRouteChrome,
  BeaconFeatureRouteFooter,
  BeaconFeatureRouteHeader,
  BeaconFeatureRouteScrollBody,
  BeaconFeatureRouteSubheader,
} from "@/app/ui/beacon-feature-route-chrome";
import { IMAGE_UPLOAD_CONTINUE_TO_ADD_LABEL, IMAGE_UPLOAD_FEATURE_NAME } from "@/shared/lib/beacon-feature-route-copy";
import { Button } from "@/shared/ui/button";

export type ImageEditorRouteChromeProps = {
  children: ReactNode;
  subheader?: ReactNode;
  footer?: ReactNode;
};

export function ImageEditorRouteChrome(props: ImageEditorRouteChromeProps) {
  const { children, subheader, footer } = props;
  return (
    <BeaconFeatureRouteChrome
      header={<BeaconFeatureRouteHeader title={IMAGE_UPLOAD_FEATURE_NAME} dataSlot="image_upload_route_header" />}
      subheader={
        subheader ? (
          <BeaconFeatureRouteSubheader dataSlot="image_upload_route_subheader">{subheader}</BeaconFeatureRouteSubheader>
        ) : null
      }
      footer={
        footer ? (
          <BeaconFeatureRouteFooter dataSlot="image_upload_route_footer" className="flex-col gap-0">
            {footer}
          </BeaconFeatureRouteFooter>
        ) : null
      }
    >
      <BeaconFeatureRouteScrollBody contentClassName="min-h-full">{children}</BeaconFeatureRouteScrollBody>
    </BeaconFeatureRouteChrome>
  );
}

export function ImageEditorRouteContinueAction(props: { disabled: boolean; onContinue: () => void }) {
  const { disabled, onContinue } = props;
  return (
    <Button
      type="button"
      variant="cmsSlotsCard"
      size="cmsSlotsCard"
      disabled={disabled}
      aria-label={IMAGE_UPLOAD_CONTINUE_TO_ADD_LABEL}
      onClick={onContinue}
    >
      <span>{IMAGE_UPLOAD_CONTINUE_TO_ADD_LABEL}</span>
      <ArrowRight aria-hidden className="size-5 shrink-0" strokeWidth={2.25} />
    </Button>
  );
}
