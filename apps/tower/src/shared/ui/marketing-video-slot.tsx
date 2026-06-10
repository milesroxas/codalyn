"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/shared/lib/utils";
import type { MarketingVideoSlotShader } from "@/shared/ui/marketing-shader-presets";
import { MarketingVideoSlotShaderLayer } from "@/shared/ui/marketing-video-slot-shader";

type MarketingVideoSlotProps = {
  src?: string;
  poster?: string;
  label?: string;
  shader?: MarketingVideoSlotShader;
  className?: string;
};

function MarketingVideoSlotPlayback({
  src,
  poster,
  label = "Product demo video",
  shader,
  className,
}: MarketingVideoSlotProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      setIsVideoReady(true);
    }
  }, []);

  const showShader = Boolean(shader && (!src || !isVideoReady));
  const showPlaceholder = !src && !shader;

  return (
    <div
      data-slot="marketing-video-slot"
      className={cn(
        "relative flex min-h-80 flex-1 self-stretch overflow-hidden rounded-[10px]",
        showPlaceholder && "bg-[#464646]",
        showShader && "bg-black",
        className
      )}
    >
      {showShader && shader ? <MarketingVideoSlotShaderLayer shader={shader} /> : null}
      {src ? (
        <video
          ref={videoRef}
          className="size-full object-cover"
          src={src}
          poster={poster}
          autoPlay
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
  return <MarketingVideoSlotPlayback key={props.src ?? "placeholder"} {...props} />;
}

export { MarketingVideoSlot };
