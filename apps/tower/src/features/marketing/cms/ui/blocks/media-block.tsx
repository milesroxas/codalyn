import type { MediaBlock as MediaBlockProps } from "@/payload-types";
import { CmsMedia } from "./cms-media";

/** Full-width media row nested inside a Content section — rounded, no border, per design. */
function MediaBlock({ media, caption }: MediaBlockProps) {
  return (
    <figure data-slot="cms-media-block" className="flex flex-col gap-3">
      <CmsMedia media={media} />
      {caption ? <figcaption className="text-sm text-muted-foreground">{caption}</figcaption> : null}
    </figure>
  );
}

export { MediaBlock };
