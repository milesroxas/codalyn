import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import {
  BeaconFeatureRouteChrome,
  BeaconFeatureRouteDockButton,
  BeaconFeatureRouteFooter,
  BeaconFeatureRouteHeader,
  BeaconFeatureRouteScrollBody,
  BeaconFeatureRouteSubheader,
} from "@/app/ui/beacon-feature-route-chrome";
import { IMAGE_UPLOAD_FEATURE_NAME } from "@/shared/lib/beacon-feature-route-copy";

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
          <BeaconFeatureRouteFooter dataSlot="image_upload_route_footer" className="items-stretch gap-2">
            {footer}
          </BeaconFeatureRouteFooter>
        ) : null
      }
    >
      <BeaconFeatureRouteScrollBody scrollResetKey={scrollResetKey}>{children}</BeaconFeatureRouteScrollBody>
    </BeaconFeatureRouteChrome>
  );
}

export function ImageEditorRouteFooterAction(props: {
  label: string;
  disabled: boolean;
  busy?: boolean;
  onAction: () => void;
  trailingIcon: ReactNode;
}) {
  const { label, disabled, busy = false, onAction, trailingIcon } = props;
  return (
    <BeaconFeatureRouteDockButton
      type="button"
      stretch
      emphasized={!disabled}
      disabled={disabled}
      aria-label={label}
      aria-busy={busy}
      onClick={() => void onAction()}
    >
      {busy ? <Loader2 aria-hidden className="animate-spin" strokeWidth={2.25} /> : null}
      {label}
      {!busy ? trailingIcon : null}
    </BeaconFeatureRouteDockButton>
  );
}
