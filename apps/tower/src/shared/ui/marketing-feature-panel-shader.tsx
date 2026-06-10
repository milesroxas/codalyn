"use client";

import { MeshGradient } from "@paper-design/shaders-react";
import { useEffect, useState } from "react";

import { cn } from "@/shared/lib/utils";
import {
  MARKETING_FEATURE_PANEL_SHADER_PRESETS,
  type MarketingFeaturePanelAccent,
} from "@/shared/ui/marketing-shader-presets";

function MarketingFeaturePanelShader({ accent }: { accent: MarketingFeaturePanelAccent }) {
  const preset = MARKETING_FEATURE_PANEL_SHADER_PRESETS[accent];
  const [motionSpeed, setMotionSpeed] = useState(0);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncSpeed = () => setMotionSpeed(media.matches ? 0 : preset.mesh.speed);
    syncSpeed();
    media.addEventListener("change", syncSpeed);
    return () => media.removeEventListener("change", syncSpeed);
  }, [preset.mesh.speed]);

  return (
    <>
      <MeshGradient
        {...preset.mesh}
        speed={motionSpeed}
        aria-hidden
        className={cn("pointer-events-none absolute inset-0 h-full w-full overflow-hidden", preset.meshClassName)}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(10,10,10,0.2))]" />
    </>
  );
}

export { MarketingFeaturePanelShader };
