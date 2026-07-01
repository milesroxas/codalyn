"use client";

import { useEffect, useRef, useState } from "react";

import { attachHlsSource } from "@/shared/lib/attach-hls";
import { buildImageDeliveryUrl } from "@/shared/lib/cloudflare-images";
import { buildStreamManifestUrl, buildStreamThumbnailUrl } from "@/shared/lib/cloudflare-stream";
import { cn } from "@/shared/lib/utils";

/** Public customer subdomain — same Cloudflare account across projects. */
const DEFAULT_CUSTOMER_SUBDOMAIN = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN;
/** Public Cloudflare Images account hash — same account across projects. */
const DEFAULT_IMAGES_ACCOUNT_HASH = process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH;

type CloudflareStreamVideoProps = {
  /** Cloudflare Stream video UID (opaque id from the dashboard). */
  uid: string;
  /** Override the customer subdomain; defaults to the env-configured account. */
  customerSubdomain?: string;
  /** Explicit poster URL. Takes precedence over `posterImageId` and the Stream thumbnail. */
  poster?: string;
  /** Cloudflare Images id used to build the poster; falls back to the Stream thumbnail when unset. */
  posterImageId?: string;
  /** Cloudflare Images variant for `posterImageId` (default "public"). */
  posterVariant?: string;
  /** Override the Cloudflare Images account hash; defaults to the env-configured account. */
  imagesAccountHash?: string;
  /** Optional WebVTT captions URL. Stream also delivers in-band captions through the HLS manifest. */
  captionsSrc?: string;
  label?: string;
  className?: string;
};

function CloudflareStreamVideo({
  uid,
  customerSubdomain = DEFAULT_CUSTOMER_SUBDOMAIN,
  poster,
  posterImageId,
  posterVariant,
  imagesAccountHash = DEFAULT_IMAGES_ACCOUNT_HASH,
  captionsSrc,
  label = "Product demo video",
  className,
}: CloudflareStreamVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const manifestUrl = buildStreamManifestUrl({ uid, customerSubdomain });
  const imagePoster = posterImageId
    ? buildImageDeliveryUrl({ imageId: posterImageId, accountHash: imagesAccountHash, variant: posterVariant })
    : null;
  const streamPoster = buildStreamThumbnailUrl({ uid, customerSubdomain });
  const posterUrl = poster ?? imagePoster ?? streamPoster ?? undefined;
  const isConfigured = Boolean(manifestUrl);

  // Attach the HLS source only once the viewer requests playback — keeps the
  // resting hero light (poster only) and lazy-loads hls.js off the critical path.
  useEffect(() => {
    if (!isPlaying) return;
    const video = videoRef.current;
    if (!video || !manifestUrl) return;
    return attachHlsSource(video, manifestUrl, { autoPlay: true });
  }, [isPlaying, manifestUrl]);

  return (
    <div
      data-slot="cloudflare-stream-video"
      className={cn("relative aspect-video w-full overflow-clip rounded-xl bg-neutral-800", className)}
    >
      <video
        ref={videoRef}
        className="size-full object-cover"
        poster={posterUrl}
        preload="none"
        playsInline
        controls={isPlaying}
        aria-label={label}
      >
        {/* Captions are delivered in-band via the Stream HLS manifest; this track adds an optional WebVTT source. */}
        <track kind="captions" src={captionsSrc} label="Captions" />
      </video>

      {isPlaying ? null : (
        <button
          type="button"
          onClick={() => setIsPlaying(true)}
          disabled={!isConfigured}
          aria-label={`Play ${label}`}
          className="group absolute inset-0 flex items-center justify-center outline-none disabled:cursor-default"
        >
          <span
            className={cn(
              "flex items-center justify-center rounded-full bg-black p-6 text-white shadow-lg",
              "transition duration-200 ease-out",
              "group-hover:scale-105 group-focus-visible:scale-105",
              "group-focus-visible:ring-2 group-focus-visible:ring-white/70 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-black",
              "motion-reduce:transition-none motion-reduce:group-hover:scale-100",
              !isConfigured && "opacity-40"
            )}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 32 32"
              aria-hidden="true"
              className="shrink-0 translate-x-px"
            >
              <path
                d="M9.333 5.333v21.334l17.334-10.667-17.334-10.667"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}

export { CloudflareStreamVideo };
