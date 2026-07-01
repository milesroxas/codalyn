import type * as React from "react";

import { cn } from "@/shared/lib/utils";
import { MarketingFeaturePanel, MarketingFeatureRoleSection } from "@/shared/ui/marketing-feature-panel";
import type { MarketingFeaturePanelAccent, MarketingVideoSlotShader } from "@/shared/ui/marketing-shader-presets";
import { MarketingVideoSlot } from "@/shared/ui/marketing-video-slot";

type MarketingFeatureRole = {
  label: string;
  steps: readonly string[];
};

type MarketingFeatureRowProps = {
  icon: React.ReactNode;
  title: string;
  roles: readonly MarketingFeatureRole[];
  accent: MarketingFeaturePanelAccent;
  videoSrc?: string;
  videoStreamUid?: string;
  videoPoster?: string;
  videoLabel?: string;
  mediaShader?: MarketingVideoSlotShader;
  mediaPosition?: "start" | "end";
  className?: string;
};

function MarketingFeatureRow({
  icon,
  title,
  roles,
  accent,
  videoSrc,
  videoStreamUid,
  videoPoster,
  videoLabel,
  mediaShader,
  mediaPosition = "end",
  className,
}: MarketingFeatureRowProps) {
  const panel = (
    <MarketingFeaturePanel accent={accent} icon={icon} title={title}>
      <div className="flex flex-col gap-8">
        {roles.map((role) => (
          <MarketingFeatureRoleSection key={role.label} label={role.label} steps={role.steps} />
        ))}
      </div>
    </MarketingFeaturePanel>
  );

  const media = (
    <MarketingVideoSlot
      src={videoSrc}
      streamUid={videoStreamUid}
      poster={videoPoster}
      label={videoLabel}
      shader={mediaShader}
    />
  );

  return (
    <div
      data-slot="marketing-feature-row"
      className={cn("flex flex-col gap-6 lg:flex-row lg:items-start lg:min-h-0", className)}
    >
      {mediaPosition === "start" ? (
        <>
          {media}
          {panel}
        </>
      ) : (
        <>
          {panel}
          {media}
        </>
      )}
    </div>
  );
}

export type { MarketingFeatureRole };
export { MarketingFeatureRow };
