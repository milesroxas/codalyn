import type { VideoBlock as VideoBlockProps } from "@/payload-types";
import { CmsStreamVideo } from "./cms-stream-video";

/** Full-width Cloudflare Stream video row nested inside a Content section. */
function VideoBlock({ video, playback, caption }: VideoBlockProps) {
  return (
    <figure data-slot="cms-video-block" className="flex flex-col gap-3">
      <CmsStreamVideo video={video} playback={playback} />
      {caption ? <figcaption className="text-sm text-muted-foreground">{caption}</figcaption> : null}
    </figure>
  );
}

export { VideoBlock };
