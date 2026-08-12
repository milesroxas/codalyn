import { type CSSProperties, type KeyboardEvent, type PointerEvent, useCallback, useRef, useState } from "react";

export type QualityComparePopoutPageProps = {
  quality: number;
  originalSrc: string | null;
  compressedSrc: string | null;
  aspectRatio: number;
  encodeError: boolean;
  onQualityInput: (quality: number) => void;
  onQualityCommit: (quality: number) => void;
  onSaveClose: () => void;
};

/**
 * Presentational compression-compare popout page (quality-compare.html). Styled by the page's own
 * stylesheet (public/quality-compare.css) — the popout window ships without the extension's
 * Tailwind bundle. The two continuous values (wipe position, image aspect ratio) flow into CSS
 * custom properties consumed by that stylesheet.
 */
export function QualityComparePopoutPage(p: QualityComparePopoutPageProps) {
  const {
    quality,
    originalSrc,
    compressedSrc,
    aspectRatio,
    encodeError,
    onQualityInput,
    onQualityCommit,
    onSaveClose,
  } = p;
  const stageRef = useRef<HTMLDivElement>(null);
  const [scrubPct, setScrubPct] = useState(50);

  const setScrubFromClientX = useCallback((clientX: number) => {
    const el = stageRef.current;
    if (!el) {
      return;
    }
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) {
      return;
    }
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setScrubPct(Math.min(100, Math.max(0, Math.round(pct))));
  }, []);

  const onScrubPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      setScrubFromClientX(e.clientX);
    },
    [setScrubFromClientX]
  );

  const onScrubPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        setScrubFromClientX(e.clientX);
      }
    },
    [setScrubFromClientX]
  );

  const onScrubPointerUp = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  const onScrubKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      setScrubPct((v) => Math.max(0, v - 1));
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      setScrubPct((v) => Math.min(100, v + 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setScrubPct(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setScrubPct(100);
    }
  }, []);

  const stageVars = { "--scrub": `${scrubPct}%`, "--stage-ar": String(aspectRatio) } as CSSProperties;

  return (
    <div className="qc-page">
      <h1 className="qc-title">Compression compare</h1>
      <p className="qc-hint">
        Adjust export quality below (matches Beacon). Drag the handle on the preview to compare. Save and close applies
        quality to the extension.
      </p>
      <div className="qc-toolbar">
        <div className="qc-quality-field">
          <label htmlFor="quality">Export quality</label>
          <div className="qc-quality-row">
            <input
              type="range"
              id="quality"
              min={0.05}
              max={1}
              step={0.01}
              value={quality}
              onChange={(e) => onQualityInput(Number(e.currentTarget.value))}
              onPointerUp={(e) => onQualityCommit(Number(e.currentTarget.value))}
              onKeyUp={(e) => onQualityCommit(Number(e.currentTarget.value))}
            />
            <span className="qc-quality-pct">{Math.round(quality * 100)}%</span>
          </div>
        </div>
        <button type="button" className="qc-save-btn" onClick={onSaveClose}>
          Save and close
        </button>
        <p className={encodeError ? "qc-err qc-err-show" : "qc-err"} role="alert">
          {encodeError ? "Could not update preview at this quality. Try another value or check your connection." : ""}
        </p>
      </div>
      <div className="qc-stage-wrap">
        <div className="qc-stage" ref={stageRef} style={stageVars}>
          {compressedSrc ? <img src={compressedSrc} alt="Compressed preview" /> : null}
          <div className="qc-clip">{originalSrc ? <img src={originalSrc} alt="Original preview" /> : null}</div>
          <div className="qc-divider" />
          <div className="qc-wipe-handle" />
          <div
            className="qc-scrub-hit"
            role="slider"
            tabIndex={0}
            aria-valuenow={scrubPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Compare original and compressed"
            aria-valuetext={`${scrubPct}% original on the left`}
            onPointerDown={onScrubPointerDown}
            onPointerMove={onScrubPointerMove}
            onPointerUp={onScrubPointerUp}
            onPointerCancel={onScrubPointerUp}
            onKeyDown={onScrubKeyDown}
          />
          <div className="qc-labels">
            <span>Original</span>
            <span>Compressed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
