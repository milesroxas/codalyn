"use client";

import { useEffect, useRef, useState } from "react";

import { attachHlsSource } from "@/shared/lib/attach-hls";
import { buildStreamManifestUrl, buildStreamThumbnailUrl } from "@/shared/lib/cloudflare-stream";
import { cn } from "@/shared/lib/utils";
import type { MarketingVideoSlotShader } from "@/shared/ui/marketing-shader-presets";
import { MarketingVideoSlotShaderLayer } from "@/shared/ui/marketing-video-slot-shader";

/** Public customer subdomain — same Cloudflare account across projects. */
const DEFAULT_CUSTOMER_SUBDOMAIN = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN;

type MarketingVideoSlotProps = {
  /** Direct video URL (e.g. an mp4). Mutually exclusive with `streamUid`. */
  src?: string;
  /** Cloudflare Stream video UID; played as an autoplaying, muted, looping HLS source. */
  streamUid?: string;
  /** Override the customer subdomain; defaults to the env-configured account. */
  customerSubdomain?: string;
  /** Override the poster; defaults to the Stream thumbnail when `streamUid` is set. */
  poster?: string;
  label?: string;
  shader?: MarketingVideoSlotShader;
  className?: string;
};

function MarketingVideoSlotPlayback({
  src,
  streamUid,
  customerSubdomain = DEFAULT_CUSTOMER_SUBDOMAIN,
  poster,
  label = "Product demo video",
  shader,
  className,
}: MarketingVideoSlotProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);

  const manifestUrl = streamUid ? buildStreamManifestUrl({ uid: streamUid, customerSubdomain }) : null;
  const posterUrl =
    poster ?? (streamUid ? (buildStreamThumbnailUrl({ uid: streamUid, customerSubdomain }) ?? undefined) : undefined);
  const hasVideo = Boolean(src) || Boolean(manifestUrl);

  // Cloudflare Stream path: attach HLS (native or hls.js) and autoplay the muted loop.
  useEffect(() => {
    if (!manifestUrl) return;
    const video = videoRef.current;
    if (!video) return;
    return attachHlsSource(video, manifestUrl, { autoPlay: true });
  }, [manifestUrl]);

  // Direct-src path: a frame may already be buffered before the effect runs.
  useEffect(() => {
    const video = videoRef.current;
    if (video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      setIsVideoReady(true);
    }
  }, []);

  const showShader = Boolean(shader && (!hasVideo || !isVideoReady));
  const showPlaceholder = !hasVideo && !shader;

  return (
    <div
      data-slot="marketing-video-slot"
      className={cn(
        // 16:9 box so the video fills without cropping, at any width (responsive).
        // min-w-0 lets the flex item shrink below the <video> intrinsic width so the
        // row never forces horizontal overflow (double / flashing scrollbars).
        "relative aspect-video w-full min-w-0 overflow-hidden rounded-sm lg:flex-1",
        showPlaceholder && "bg-[#464646]",
        showShader && "bg-black",
        className
      )}
    >
      {showShader && shader ? <MarketingVideoSlotShaderLayer shader={shader} /> : null}
      {hasVideo ? (
        <video
          ref={videoRef}
          className="size-full object-cover"
          // Stream sources attach via the hls.js effect; only the direct-src path uses the attribute.
          src={manifestUrl ? undefined : src}
          poster={posterUrl}
          autoPlay={!manifestUrl}
          loop
          muted
          playsInline
          aria-label={label}
          onCanPlay={() => setIsVideoReady(true)}
          onLoadedData={() => setIsVideoReady(true)}
        />
      ) : null}
    </div>
  );
}

function MarketingVideoSlot(props: MarketingVideoSlotProps) {
  return <MarketingVideoSlotPlayback key={props.streamUid ?? props.src ?? "placeholder"} {...props} />;
}

export { MarketingVideoSlot };
