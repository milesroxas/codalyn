import type { ReactNode } from "react";
import {
  BeaconFeatureRouteBackHeader,
  BeaconFeatureRouteChrome,
  BeaconFeatureRouteScrollBody,
} from "@/app/ui/beacon-feature-route-chrome";
import { SettingsAppVersionFooter } from "@/features/settings/ui/settings-app-version-footer";

export type SettingsRouteChromeProps = {
  title: string;
  onBack: () => void;
  backLabel?: string;
  children: ReactNode;
  scrollResetKey?: string | number | boolean | null;
};

export function SettingsRouteChrome(props: SettingsRouteChromeProps) {
  const { title, onBack, backLabel, children, scrollResetKey } = props;

  return (
    <BeaconFeatureRouteChrome
      header={
        <BeaconFeatureRouteBackHeader
          title={title}
          onBack={onBack}
          backLabel={backLabel}
          dataSlot="settings_route_header"
        />
      }
      footer={<SettingsAppVersionFooter />}
    >
      <BeaconFeatureRouteScrollBody scrollResetKey={scrollResetKey}>{children}</BeaconFeatureRouteScrollBody>
    </BeaconFeatureRouteChrome>
  );
}
