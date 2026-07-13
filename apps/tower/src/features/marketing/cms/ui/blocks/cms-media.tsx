import Image from "next/image";

import { resolveCmsMedia } from "@/features/marketing/cms/lib/resolve-cms-media";
import type { Media } from "@/payload-types";
import { cn } from "@/shared/lib/utils";

type CmsMediaProps = {
  media: number | Media | null | undefined;
  className?: string;
  /** Prioritize loading — set for above-the-fold media (hero). */
  priority?: boolean;
};

/**
 * Renders a Payload media relation as an image or video by mime type.
 * Returns null when the relation is unpopulated or missing required data,
 * so callers can pass raw boundary values straight through.
 */
function CmsMedia({ media, className, priority }: CmsMediaProps) {
  const resolved = resolveCmsMedia(media);
  if (!resolved?.url) {
    return null;
  }

  if (resolved.mimeType?.startsWith("video/")) {
    return (
      <video
        src={resolved.url}
        className={cn("aspect-video w-full rounded-xl object-cover", className)}
        // Muted marketing media, matching MarketingVideoSlot — no audio track
        // means no captions requirement.
        controls
        muted
        playsInline
        preload="metadata"
        aria-label={resolved.alt}
      />
    );
  }

  if (!resolved.width || !resolved.height) {
    return null;
  }

  return (
    <Image
      src={resolved.url}
      alt={resolved.alt}
      width={resolved.width}
      height={resolved.height}
      className={cn("h-auto w-full rounded-xl", className)}
      priority={priority}
    />
  );
}

export { CmsMedia };
