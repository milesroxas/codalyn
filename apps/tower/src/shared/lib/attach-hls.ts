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
    const instance = new Hls({
      // Assume a broadband connection so ABR opens at a sharp rendition instead of
      // ramping up from Cloudflare's 240p floor — the default low estimate reads as
      // "blurry on load." ABR still downshifts if the connection can't keep up.
      abrEwmaDefaultEstimate: 4_000_000,
    });
    hls = instance;
    instance.on(Hls.Events.MANIFEST_PARSED, () => {
      // Open on the highest rendition so playback starts crisp instead of ramping
      // up over the first few seconds. `startLevel` only governs the first fragment;
      // ABR takes over from the second onward and downshifts if bandwidth drops.
      instance.startLevel = instance.levels.length - 1;
      if (autoPlay) void video.play();
    });
    instance.loadSource(manifestUrl);
    instance.attachMedia(video);
  });

  return () => {
    cancelled = true;
    hls?.destroy();
  };
}
