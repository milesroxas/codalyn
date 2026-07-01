/**
 * Attach an HLS manifest to a <video> element.
 *
 * Uses native HLS where available (Safari/iOS) and lazy-loads hls.js elsewhere,
 * keeping the dependency off the critical path. Shared by every Cloudflare Stream
 * player (hero click-to-play, feature-row autoplay loops) so the browser-shape
 * branching lives in exactly one place.
 *
 * Returns a detach function that cancels a pending load and destroys the hls.js
 * instance. Call it on cleanup.
 */

export type DetachHls = () => void;

const NATIVE_HLS_MIME = "application/vnd.apple.mpegurl";

export function attachHlsSource(
  video: HTMLVideoElement,
  manifestUrl: string,
  options?: { autoPlay?: boolean }
): DetachHls {
  const autoPlay = options?.autoPlay ?? false;

  if (video.canPlayType(NATIVE_HLS_MIME) !== "") {
    video.src = manifestUrl;
    if (autoPlay) void video.play();
    return () => {
      video.removeAttribute("src");
      video.load();
    };
  }

  let cancelled = false;
  let hls: import("hls.js").default | undefined;

  void import("hls.js").then(({ default: Hls }) => {
    if (cancelled) return;
    if (!Hls.isSupported()) {
      video.src = manifestUrl;
      if (autoPlay) void video.play();
      return;
    }
    const instance = new Hls();
    hls = instance;
    instance.loadSource(manifestUrl);
    instance.attachMedia(video);
    if (autoPlay) {
      instance.on(Hls.Events.MANIFEST_PARSED, () => {
        void video.play();
      });
    }
  });

  return () => {
    cancelled = true;
    hls?.destroy();
  };
}
