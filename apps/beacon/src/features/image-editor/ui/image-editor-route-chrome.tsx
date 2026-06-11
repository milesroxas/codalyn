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
import { hasBeaconRouteSubheaderContent } from "@/shared/ui/step-nav";

export type ImageEditorRouteChromeProps = {
  children: ReactNode;
  subheader?: ReactNode;
  footer?: ReactNode;
  scrollResetKey?: string | number | boolean | null;
  /** When false, route body fills the viewport and nested regions own vertical scroll. */
  scrollable?: boolean;
  contentClassName?: string;
};

export function ImageEditorRouteChrome(props: ImageEditorRouteChromeProps) {
  const { children, subheader, footer, scrollResetKey, scrollable = true, contentClassName } = props;
  const routeSubheader = hasBeaconRouteSubheaderContent(subheader) ? (
    <BeaconFeatureRouteSubheader dataSlot="image_upload_route_subheader">{subheader}</BeaconFeatureRouteSubheader>
  ) : null;
  return (
    <BeaconFeatureRouteChrome
      header={<BeaconFeatureRouteHeader title={IMAGE_UPLOAD_FEATURE_NAME} dataSlot="image_upload_route_header" />}
      subheader={routeSubheader}
      footer={
        footer ? (
          <BeaconFeatureRouteFooter dataSlot="image_upload_route_footer" layout="dockActions">
            {footer}
          </BeaconFeatureRouteFooter>
        ) : null
      }
    >
      <BeaconFeatureRouteScrollBody
        contentClassName={contentClassName}
        scrollResetKey={scrollResetKey}
        scrollable={scrollable}
      >
        {children}
      </BeaconFeatureRouteScrollBody>
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
