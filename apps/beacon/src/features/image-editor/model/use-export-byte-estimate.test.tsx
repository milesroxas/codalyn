/** @vitest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { estimateEncodedOutputBytes } from "@/features/image-editor/lib/estimate-encoded-size";

import { useExportByteEstimate } from "./use-export-byte-estimate";

vi.mock("@/features/image-editor/lib/estimate-encoded-size", () => ({
  estimateEncodedOutputBytes: vi.fn().mockResolvedValue(12_345),
}));

const completedCrop = { x: 0, y: 0, width: 300, height: 200 };
type EstimateProps = {
  imageSrc: string;
  width: number;
  height: number;
  exportFormat: "webp" | "avif";
};

async function flushEstimateDebounce() {
  await act(async () => {
    vi.advanceTimersByTime(500);
    await Promise.resolve();
  });
}

describe("useExportByteEstimate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(estimateEncodedOutputBytes).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("estimates encoded bytes when ready", async () => {
    renderHook(() =>
      useExportByteEstimate({
        imageSrc: "blob:source-a",
        completedCrop,
        effectiveOutputW: 1200,
        effectiveOutputH: 800,
        quality: 0.8,
        exportFormat: "webp",
        enabled: true,
      })
    );

    await flushEstimateDebounce();

    expect(estimateEncodedOutputBytes).toHaveBeenCalledTimes(1);
    expect(estimateEncodedOutputBytes).toHaveBeenCalledWith(
      expect.objectContaining({
        imageSrc: "blob:source-a",
        outputWidth: 1200,
        outputHeight: 800,
        quality: 0.8,
        format: "webp",
      })
    );
  });

  it("re-estimates when quality changes", async () => {
    const { rerender } = renderHook(
      ({ quality }: { quality: number }) =>
        useExportByteEstimate({
          imageSrc: "blob:source-a",
          completedCrop,
          effectiveOutputW: 1200,
          effectiveOutputH: 800,
          quality,
          exportFormat: "webp",
          enabled: true,
        }),
      { initialProps: { quality: 0.9 } }
    );

    await flushEstimateDebounce();
    rerender({ quality: 0.5 });
    await flushEstimateDebounce();

    expect(estimateEncodedOutputBytes).toHaveBeenCalledTimes(2);
    expect(vi.mocked(estimateEncodedOutputBytes).mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        quality: 0.5,
      })
    );
  });

  it("re-estimates when dimensions, format, and source image change", async () => {
    const initialProps: EstimateProps = {
      imageSrc: "blob:source-a",
      width: 1200,
      height: 800,
      exportFormat: "webp",
    };
    const { rerender } = renderHook(
      ({ imageSrc, width, height, exportFormat }: EstimateProps) =>
        useExportByteEstimate({
          imageSrc,
          completedCrop,
          effectiveOutputW: width,
          effectiveOutputH: height,
          quality: 0.75,
          exportFormat,
          enabled: true,
        }),
      { initialProps }
    );

    await flushEstimateDebounce();

    rerender({
      imageSrc: "blob:source-a",
      width: 800,
      height: 533,
      exportFormat: "webp",
    });
    await flushEstimateDebounce();

    rerender({
      imageSrc: "blob:source-a",
      width: 800,
      height: 533,
      exportFormat: "avif",
    });
    await flushEstimateDebounce();

    rerender({
      imageSrc: "blob:source-b",
      width: 800,
      height: 533,
      exportFormat: "avif",
    });
    await flushEstimateDebounce();

    expect(estimateEncodedOutputBytes).toHaveBeenCalledTimes(4);
    expect(vi.mocked(estimateEncodedOutputBytes).mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({ outputWidth: 800, outputHeight: 533 })
    );
    expect(vi.mocked(estimateEncodedOutputBytes).mock.calls[2]?.[0]).toEqual(
      expect.objectContaining({ format: "avif" })
    );
    expect(vi.mocked(estimateEncodedOutputBytes).mock.calls[3]?.[0]).toEqual(
      expect.objectContaining({ imageSrc: "blob:source-b" })
    );
  });
});
