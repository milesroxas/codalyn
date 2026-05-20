import { ArrowRight, Crop, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import {
  BeaconFeatureRouteChrome,
  BeaconFeatureRouteFooter,
  BeaconFeatureRouteHeader,
  BeaconFeatureRouteScrollBody,
  BeaconFeatureRouteSubheader,
} from "@/app/ui/beacon-feature-route-chrome";
import { IMAGE_UPLOAD_FEATURE_NAME } from "@/shared/lib/beacon-feature-route-copy";
import { Button } from "@/shared/ui/button";

export type ImageEditorRouteChromeProps = {
  children: ReactNode;
  subheader?: ReactNode;
  footer?: ReactNode;
  scrollResetKey?: string;
};

export function ImageEditorRouteChrome(props: ImageEditorRouteChromeProps) {
  const { children, subheader, footer, scrollResetKey } = props;
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
      <BeaconFeatureRouteScrollBody scrollResetKey={scrollResetKey}>{children}</BeaconFeatureRouteScrollBody>
    </BeaconFeatureRouteChrome>
  );
}

export function ImageEditorRouteContinueAction(props: { label: string; disabled: boolean; onContinue: () => void }) {
  const { label, disabled, onContinue } = props;
  return (
    <Button
      type="button"
      variant="cmsSlotsCard"
      size="cmsSlotsCard"
      disabled={disabled}
      aria-label={label}
      onClick={onContinue}
    >
      <span>{label}</span>
      <ArrowRight aria-hidden className="size-5 shrink-0" strokeWidth={2.25} />
    </Button>
  );
}

export function ImageEditorRoutePlaceAction(props: {
  label: string;
  disabled: boolean;
  busy: boolean;
  onPlace: () => void;
}) {
  const { label, disabled, busy, onPlace } = props;
  return (
    <Button
      type="button"
      variant="cmsSlotsCard"
      size="cmsSlotsCard"
      disabled={disabled}
      aria-label={label}
      aria-busy={busy}
      onClick={() => void onPlace()}
    >
      {busy ? <Loader2 aria-hidden className="size-5 shrink-0 animate-spin" strokeWidth={2.25} /> : null}
      <span>{label}</span>
      {!busy ? <Crop aria-hidden className="size-5 shrink-0" strokeWidth={2.25} /> : null}
    </Button>
  );
}
