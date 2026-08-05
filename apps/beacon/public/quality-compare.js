/**
 * Beacon compression-compare popout runtime (quality-compare.html). Static file shipped in the
 * extension bundle — no blob-URL document, no inline script (Webflow Marketplace CSP/technical
 * guidelines). The page is same-origin with the opener extension; it announces readiness and the
 * opener replies with an `init` message carrying the image Blobs and initial settings.
 *
 * Protocol constants mirror src/features/image-editor/lib/quality-popout-protocol.ts; the unit
 * test quality-compare-popout-page.test.ts keeps them in sync.
 */
(() => {
  const POPOUT_SOURCE = "beacon-quality-popout-v1";
  const PARENT_SOURCE = "beacon-quality-parent-v1";
  // Same-origin bridge: the opener extension serves this page, so its origin is ours.
  const TARGET_ORIGIN = window.location.origin;
  const DEBOUNCE_MS = 400;

  const stage = document.getElementById("stage");
  const compareScrubHit = document.getElementById("compareScrubHit");
  const qualityEl = document.getElementById("quality");
  const qualityPct = document.getElementById("qualityPct");
  const saveClose = document.getElementById("saveClose");
  const imgCompressed = document.getElementById("imgCompressed");
  const imgOriginal = document.getElementById("imgOriginal");
  const encodeErr = document.getElementById("encodeErr");

  let scrubPct = 50;

  function clampExportQuality(raw) {
    const q = Number(raw);
    if (!Number.isFinite(q)) return 0.8;
    return Math.min(1, Math.max(0.05, q));
  }

  // All layout state is declared in quality-compare.css; the two continuous values (wipe
  // position, image aspect ratio) flow in as CSS custom properties via CSSOM setProperty —
  // no style attributes, no runtime style tags. The aria-value* writes keep the slider
  // accessible and are the standard platform API for that.
  function applyScrub(pct) {
    const v = Math.max(0, Math.min(100, Math.round(pct)));
    scrubPct = v;
    stage.style.setProperty("--scrub", `${v}%`);
    compareScrubHit.setAttribute("aria-valuenow", String(v));
    compareScrubHit.setAttribute("aria-valuetext", `${v}% original on the left`);
  }

  function scrubFromClientX(clientX) {
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    if (rect.width <= 0) return;
    applyScrub(((clientX - rect.left) / rect.width) * 100);
  }

  compareScrubHit.addEventListener("pointerdown", (e) => {
    compareScrubHit.setPointerCapture(e.pointerId);
    scrubFromClientX(e.clientX);
  });
  compareScrubHit.addEventListener("pointermove", (e) => {
    if (compareScrubHit.hasPointerCapture(e.pointerId)) {
      scrubFromClientX(e.clientX);
    }
  });
  compareScrubHit.addEventListener("pointerup", (e) => {
    if (compareScrubHit.hasPointerCapture(e.pointerId)) {
      compareScrubHit.releasePointerCapture(e.pointerId);
    }
  });
  compareScrubHit.addEventListener("pointercancel", (e) => {
    if (compareScrubHit.hasPointerCapture(e.pointerId)) {
      compareScrubHit.releasePointerCapture(e.pointerId);
    }
  });
  compareScrubHit.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      applyScrub(scrubPct - 1);
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      applyScrub(scrubPct + 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      applyScrub(0);
    } else if (e.key === "End") {
      e.preventDefault();
      applyScrub(100);
    }
  });
  applyScrub(50);

  function setQualityPctLabel() {
    const q = Number(qualityEl.value);
    qualityPct.textContent = `${Math.round(q * 100)}%`;
  }
  setQualityPctLabel();

  let qualityTimer = null;
  function notifyQualityPreview() {
    if (!window.opener) return;
    const q = Number(qualityEl.value);
    window.opener.postMessage({ source: POPOUT_SOURCE, type: "preview-quality-changed", quality: q }, TARGET_ORIGIN);
  }
  function scheduleQualityNotify() {
    setQualityPctLabel();
    encodeErr.classList.remove("show");
    if (qualityTimer) clearTimeout(qualityTimer);
    qualityTimer = setTimeout(() => {
      qualityTimer = null;
      notifyQualityPreview();
    }, DEBOUNCE_MS);
  }
  qualityEl.addEventListener("input", scheduleQualityNotify);
  qualityEl.addEventListener("change", () => {
    setQualityPctLabel();
    if (qualityTimer) clearTimeout(qualityTimer);
    qualityTimer = null;
    notifyQualityPreview();
  });

  saveClose.addEventListener("click", () => {
    if (!window.opener) return;
    const q = Number(qualityEl.value);
    window.opener.postMessage({ source: POPOUT_SOURCE, type: "save-and-close", quality: q }, TARGET_ORIGIN);
  });

  function revokeBlobUrl(url) {
    if (url?.indexOf("blob:") !== 0) return;
    try {
      URL.revokeObjectURL(url);
    } catch {}
  }

  let initialized = false;
  function initFromParent(d) {
    if (initialized) return;
    initialized = true;
    const ar = Number(d.aspectRatio);
    stage.style.setProperty("--stage-ar", String(Number.isFinite(ar) && ar > 0 ? ar : 1));
    qualityEl.value = String(clampExportQuality(d.initialQuality));
    setQualityPctLabel();
    // Blob URLs are minted here, in this document's own URL store, and revoked on pagehide below.
    imgOriginal.src = URL.createObjectURL(d.originalBlob);
    imgCompressed.src = URL.createObjectURL(d.compressedBlob);
  }

  function applyCompressedUpdate(blob) {
    encodeErr.classList.remove("show");
    const nextCompressed = URL.createObjectURL(blob);
    const prevCompressed = imgCompressed.src;
    imgCompressed.src = nextCompressed;
    if (prevCompressed !== nextCompressed) {
      revokeBlobUrl(prevCompressed);
    }
  }

  function showCompressedError() {
    encodeErr.textContent = "Could not update preview at this quality. Try another value or check your connection.";
    encodeErr.classList.add("show");
  }

  // Accept messages only from the exact opener window (Marketplace review hardening): a
  // same-origin document other than the opener must not be able to drive this popout.
  function isTrustedParentMessage(e) {
    if (e.origin !== TARGET_ORIGIN || !window.opener || e.source !== window.opener) return false;
    return Boolean(e.data) && e.data.source === PARENT_SOURCE;
  }

  window.addEventListener("message", (e) => {
    if (!isTrustedParentMessage(e)) return;
    const d = e.data;
    if (d.type === "init" && d.originalBlob instanceof Blob && d.compressedBlob instanceof Blob) {
      initFromParent(d);
    } else if (d.type === "compressed-updated" && d.compressedBlob instanceof Blob) {
      applyCompressedUpdate(d.compressedBlob);
    } else if (d.type === "compressed-error") {
      showCompressedError();
    }
  });

  let popoutBlobsCleaned = false;
  function revokeAllPopoutBlobs() {
    if (popoutBlobsCleaned) return;
    popoutBlobsCleaned = true;
    const compressedSrc = imgCompressed.src;
    revokeBlobUrl(compressedSrc);
    if (imgOriginal && imgOriginal.src !== compressedSrc) {
      revokeBlobUrl(imgOriginal.src);
    }
  }
  window.addEventListener("beforeunload", revokeAllPopoutBlobs);
  window.addEventListener("pagehide", revokeAllPopoutBlobs);

  if (window.opener) {
    window.opener.postMessage({ source: POPOUT_SOURCE, type: "ready" }, TARGET_ORIGIN);
  }
})();
