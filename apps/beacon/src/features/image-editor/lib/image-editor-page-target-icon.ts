import { IconComponents, IconPhoto } from "@tabler/icons-react";
import type { ComponentType } from "react";

import type { ImagePageTarget } from "@/features/image-editor/lib/scan-image-targets-on-page";

export type ImagePageTargetTablerIconProps = {
  className?: string;
  stroke?: number;
};

const IMAGE_PAGE_TARGET_TABLER_ICONS: Record<ImagePageTarget["kind"], ComponentType<ImagePageTargetTablerIconProps>> = {
  image: IconPhoto,
  component: IconComponents,
};

export function imagePageTargetTablerIcon(
  kind: ImagePageTarget["kind"]
): ComponentType<ImagePageTargetTablerIconProps> {
  return IMAGE_PAGE_TARGET_TABLER_ICONS[kind];
}
