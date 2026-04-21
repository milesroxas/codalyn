import {
  BEACON_QUALITY_PARENT_SOURCE,
  BEACON_QUALITY_POPOUT_SOURCE,
} from "@/features/image-editor/lib/quality-popout-protocol";

const POPOUT_NAME = "beacon-quality-compare";

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function clampExportQuality(q: number): number {
  return Math.min(1, Math.max(0.05, q));
}

export function openQualityComparePopout(options: {
  originalBlob: Blob;
  compressedBlob: Blob;
  aspectRatio: number;
  initialQuality: number;
  targetOrigin: string;
}): Window | null {
  const { originalBlob, compressedBlob, aspectRatio, initialQuality, targetOrigin } = options;
  const ar = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 1;
  const q0 = clampExportQuality(initialQuality);
  const popWin = window.open("", POPOUT_NAME, "popup=yes,width=1120,height=900,scrollbars=yes,resizable=yes");
  if (!popWin) {
    return null;
  }

  const PopURL = (popWin as Window & { URL: typeof URL }).URL;
  const originalSrc = PopURL.createObjectURL(originalBlob);
  const compressedSrc = PopURL.createObjectURL(compressedBlob);
  const o = escapeAttr(originalSrc);
  const c = escapeAttr(compressedSrc);
  const popSrc = JSON.stringify(BEACON_QUALITY_POPOUT_SOURCE);
  const parSrc = JSON.stringify(BEACON_QUALITY_PARENT_SOURCE);
  const originJs = JSON.stringify(targetOrigin);

  popWin.document.open();
  popWin.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Beacon — compression compare</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    background: #0a0a0a;
    color: #fafafa;
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }
  h1 { font-size: 15px; font-weight: 600; margin: 0; align-self: flex-start; max-width: min(100%, 1280px); width: 100%; }
  .hint { font-size: 12px; color: #a3a3a3; margin: 0; max-width: min(100%, 1280px); width: 100%; }
  .toolbar {
    width: 100%;
    max-width: 1280px;
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 16px 24px;
    padding: 14px 16px;
    background: #171717;
    border: 1px solid #262626;
    border-radius: 10px;
  }
  .quality-field { flex: 1 1 220px; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
  .quality-field label { font-size: 11px; font-weight: 600; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.04em; }
  .quality-row { display: flex; align-items: center; gap: 12px; }
  .quality-row input[type="range"] { flex: 1; min-width: 0; height: 8px; accent-color: #fafafa; cursor: ew-resize; }
  .quality-pct { font-size: 13px; font-weight: 600; tabular-nums; min-width: 3.2em; text-align: right; color: #fafafa; }
  .save-btn {
    flex: 0 0 auto;
    padding: 10px 18px;
    font-size: 13px;
    font-weight: 600;
    color: #0a0a0a;
    background: #fafafa;
    border: none;
    border-radius: 8px;
    cursor: pointer;
  }
  .save-btn:hover { filter: brightness(0.95); }
  .save-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .err { font-size: 12px; color: #f87171; width: 100%; display: none; margin: 0; }
  .err.show { display: block; }
  .stage-wrap { width: 100%; max-width: 1280px; flex: 1; display: flex; align-items: center; justify-content: center; min-height: 200px; }
  .stage {
    position: relative;
    width: 100%;
    aspect-ratio: ${ar};
    max-height: min(75vh, 900px);
    background: #171717;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid #262626;
  }
  .stage img {
    position: absolute;
    inset: 0;
    margin: auto;
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    user-select: none;
    pointer-events: none;
  }
  .clip { position: absolute; inset: 0; overflow: hidden; }
  .divider {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    margin-left: -1px;
    background: #fff;
    box-shadow: 0 0 0 1px rgba(0,0,0,0.45);
    pointer-events: none;
    z-index: 2;
  }
  .compare-controls {
    width: 100%;
    max-width: 1280px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .compare-labels { display: flex; justify-content: space-between; font-size: 11px; font-weight: 600; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.04em; }
  #scrub { width: 100%; height: 8px; accent-color: #fafafa; cursor: ew-resize; }
</style>
</head>
<body>
  <h1>Compression compare</h1>
  <p class="hint">Adjust export quality below (matches Beacon). Wipe slider compares original vs compressed. Save and close applies quality to the extension.</p>
  <div class="toolbar">
    <div class="quality-field">
      <label for="quality">Export quality</label>
      <div class="quality-row">
        <input type="range" id="quality" min="0.05" max="1" step="0.01" value="${q0}" />
        <span class="quality-pct" id="qualityPct"></span>
      </div>
    </div>
    <button type="button" class="save-btn" id="saveClose">Save and close</button>
    <p class="err" id="encodeErr" role="alert"></p>
  </div>
  <div class="stage-wrap">
    <div class="stage" id="stage">
      <img id="imgCompressed" src="${c}" alt="" />
      <div class="clip" id="clip" style="clip-path: inset(0 50% 0 0);">
        <img id="imgOriginal" src="${o}" alt="" />
      </div>
      <div class="divider" id="divider" style="left: 50%;"></div>
    </div>
  </div>
  <div class="compare-controls">
    <span class="hint" style="margin:0">Compare wipe</span>
    <input type="range" id="scrub" min="0" max="100" step="1" value="50" aria-valuetext="50% original on the left" />
    <div class="compare-labels"><span>Original</span><span>Compressed</span></div>
  </div>
  <script>
    (function () {
      var POPOUT_SOURCE = ${popSrc};
      var PARENT_SOURCE = ${parSrc};
      var TARGET_ORIGIN = ${originJs};
      var DEBOUNCE_MS = 400;

      var scrub = document.getElementById("scrub");
      var clip = document.getElementById("clip");
      var divider = document.getElementById("divider");
      var qualityEl = document.getElementById("quality");
      var qualityPct = document.getElementById("qualityPct");
      var saveClose = document.getElementById("saveClose");
      var imgCompressed = document.getElementById("imgCompressed");
      var imgOriginal = document.getElementById("imgOriginal");
      var encodeErr = document.getElementById("encodeErr");

      function syncScrub() {
        var v = Number(scrub.value);
        clip.style.clipPath = "inset(0 " + (100 - v) + "% 0 0)";
        divider.style.left = v + "%";
        scrub.setAttribute("aria-valuetext", v + "% original on the left");
      }
      scrub.addEventListener("input", syncScrub);
      syncScrub();

      function setQualityPctLabel() {
        var q = Number(qualityEl.value);
        qualityPct.textContent = Math.round(q * 100) + "%";
      }
      setQualityPctLabel();

      var qualityTimer = null;
      function notifyQualityPreview() {
        if (!window.opener) return;
        var q = Number(qualityEl.value);
        window.opener.postMessage(
          { source: POPOUT_SOURCE, type: "preview-quality-changed", quality: q },
          TARGET_ORIGIN
        );
      }
      function scheduleQualityNotify() {
        setQualityPctLabel();
        encodeErr.classList.remove("show");
        if (qualityTimer) clearTimeout(qualityTimer);
        qualityTimer = setTimeout(function () {
          qualityTimer = null;
          notifyQualityPreview();
        }, DEBOUNCE_MS);
      }
      qualityEl.addEventListener("input", scheduleQualityNotify);
      qualityEl.addEventListener("change", function () {
        setQualityPctLabel();
        if (qualityTimer) clearTimeout(qualityTimer);
        qualityTimer = null;
        notifyQualityPreview();
      });

      saveClose.addEventListener("click", function () {
        if (!window.opener) return;
        var q = Number(qualityEl.value);
        window.opener.postMessage(
          { source: POPOUT_SOURCE, type: "save-and-close", quality: q },
          TARGET_ORIGIN
        );
      });

      window.addEventListener("message", function (e) {
        if (e.origin !== TARGET_ORIGIN) return;
        var d = e.data;
        if (!d || d.source !== PARENT_SOURCE) return;
        if (d.type === "compressed-updated" && d.compressedBlob instanceof Blob) {
          encodeErr.classList.remove("show");
          var nextCompressed = URL.createObjectURL(d.compressedBlob);
          var prevCompressed = imgCompressed.src;
          imgCompressed.src = nextCompressed;
          if (prevCompressed && prevCompressed.indexOf("blob:") === 0 && prevCompressed !== nextCompressed) {
            try {
              URL.revokeObjectURL(prevCompressed);
            } catch (x) {}
          }
        }
        if (d.type === "compressed-error") {
          encodeErr.textContent = "Could not update preview at this quality. Try another value or check your connection.";
          encodeErr.classList.add("show");
        }
      });

      function revokeBlobUrlOnce(u, seen) {
        if (!u || u.indexOf("blob:") !== 0 || seen[u]) {
          return;
        }
        seen[u] = true;
        try {
          URL.revokeObjectURL(u);
        } catch (x) {}
      }
      var popoutBlobsCleaned = false;
      function revokeAllPopoutBlobs() {
        if (popoutBlobsCleaned) {
          return;
        }
        popoutBlobsCleaned = true;
        var seen = Object.create(null);
        revokeBlobUrlOnce(imgCompressed.src, seen);
        if (imgOriginal) {
          revokeBlobUrlOnce(imgOriginal.src, seen);
        }
      }
      window.addEventListener("beforeunload", revokeAllPopoutBlobs);
      window.addEventListener("pagehide", revokeAllPopoutBlobs);
    })();
  </script>
</body>
</html>`);
  popWin.document.close();
  popWin.focus();
  return popWin;
}
