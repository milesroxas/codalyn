import type { MeshGradientProps } from "@paper-design/shaders-react";

type MarketingFeaturePanelShaderPreset = {
  panelClassName: string;
  mesh: Pick<MeshGradientProps, "colors" | "distortion" | "fit" | "scale" | "speed" | "swirl">;
  meshClassName: string;
};

export const MARKETING_FEATURE_PANEL_SHADER_PRESETS = {
  magenta: {
    panelClassName: "bg-black",
    mesh: {
      colors: ["#000000", "#000000", "#421A44", "#292966"],
      speed: 0.16,
      fit: "cover",
      scale: 4.61,
      distortion: 0.17,
      swirl: 0.1,
    },
    meshClassName: "min-h-full min-w-full",
  },
  violet: {
    panelClassName: "bg-black",
    mesh: {
      colors: ["#000000", "#000000", "#075E58", "#0A244A"],
      speed: 0.16,
      fit: "cover",
      scale: 4.61,
      distortion: 0.17,
      swirl: 0.1,
    },
    meshClassName: "min-h-full min-w-full",
  },
} as const satisfies Record<string, MarketingFeaturePanelShaderPreset>;

export type MarketingFeaturePanelAccent = keyof typeof MARKETING_FEATURE_PANEL_SHADER_PRESETS;

type MarketingVideoSlotShaderPreset = {
  mesh: Pick<MeshGradientProps, "colors" | "distortion" | "fit" | "scale" | "speed" | "swirl">;
  meshClassName: string;
};

export const MARKETING_VIDEO_SLOT_SHADER_PRESETS = {
  cmsSlots: {
    mesh: {
      colors: ["#F0D4F8", "#421A44", "#868CFF", "#292966"],
      speed: 0.53,
      fit: "cover",
      scale: 1,
      distortion: 0.16,
      swirl: 0.11,
    },
    meshClassName: "min-h-full min-w-full",
  },
  imageUpload: {
    mesh: {
      colors: ["#E0EAFF", "#28317A", "#868CFF", "#008DBC"],
      speed: 0.53,
      fit: "cover",
      scale: 1,
      distortion: 0.16,
      swirl: 0.11,
    },
    meshClassName: "min-h-full min-w-full",
  },
} as const satisfies Record<string, MarketingVideoSlotShaderPreset>;

export type MarketingVideoSlotShader = keyof typeof MARKETING_VIDEO_SLOT_SHADER_PRESETS;
