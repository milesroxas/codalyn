import { resolveCmsStreamVideo } from "@/features/marketing/cms/lib/resolve-cms-media";
import type { StreamVideo } from "@/payload-types";
import { CloudflareStreamVideo } from "@/shared/ui/cloudflare-stream-video";
import { MarketingVideoSlot } from "@/shared/ui/marketing-video-slot";

type CmsStreamVideoProps = {
  video: number | StreamVideo | null | undefined;
  /** `clickToPlay`: poster + play button with controls. `loop`: autoplaying muted ambient loop. */
  playback?: "clickToPlay" | "loop";
  className?: string;
};

/**
 * Renders a `stream-videos` relation with the shared Cloudflare Stream
 * players. Returns null when the relation is unpopulated or the UID is
 * invalid, so callers can pass raw boundary values straight through.
 */
function CmsStreamVideo({ video, playback = "clickToPlay", className }: CmsStreamVideoProps) {
  const resolved = resolveCmsStreamVideo(video);
  if (!resolved) {
    return null;
  }

  if (playback === "loop") {
    return (
      <MarketingVideoSlot
        streamUid={resolved.uid}
        poster={resolved.posterUrl ?? undefined}
        label={resolved.title}
        className={className}
      />
    );
  }

  return (
    <CloudflareStreamVideo
      uid={resolved.uid}
      poster={resolved.posterUrl ?? undefined}
      label={resolved.title}
      className={className}
    />
  );
}

export { CmsStreamVideo };
