import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import {
  BeaconFeatureRouteChrome,
  BeaconFeatureRouteDockButton,
  BeaconFeatureRouteFooter,
  BeaconFeatureRouteScrollBody,
  BeaconFeatureRouteSubheader,
} from "@/app/ui/beacon-feature-route-chrome";
import { hasBeaconRouteSubheaderContent } from "@/shared/ui/step-nav";

export type ImageEditorRouteChromeProps = {
  children: ReactNode;
  subheader?: ReactNode;
  footer?: ReactNode;
  scrollResetKey?: string | number | boolean | null;
  /** When false, route body fills the viewport and nested regions own vertical scroll. */
  scrollable?: boolean;
  contentClassName?: string;
  /**
   * - `default` — title header above a backgrounded breadcrumbs strip (standalone route).
   * - `breadcrumbsOnly` — drop the title header and render breadcrumbs transparent (hosted in a sheet that owns its own title).
   */
  headerVariant?: "default" | "breadcrumbsOnly";
};

export function ImageEditorRouteChrome(props: ImageEditorRouteChromeProps) {
  const {
    children,
    subheader,
    footer,
    scrollResetKey,
    scrollable = true,
    contentClassName,
    headerVariant = "default",
  } = props;
  const breadcrumbsOnly = headerVariant === "breadcrumbsOnly";
  const routeSubheader = hasBeaconRouteSubheaderContent(subheader) ? (
    <BeaconFeatureRouteSubheader
      dataSlot="image_upload_route_subheader"
      surface={breadcrumbsOnly ? "plain" : "default"}
    >
      {subheader}
    </BeaconFeatureRouteSubheader>
  ) : null;
  return (
    <BeaconFeatureRouteChrome
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
