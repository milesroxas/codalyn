/** @vitest-environment jsdom */
import { BEACON_IMAGE_ERROR_CODES } from "@codalyn/webflow-kit";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useImageDissolveTransition } from "./use-image-dissolve-transition";

const { validateMock, createSourceImageFileValidatorMock } = vi.hoisted(() => {
  const validate = vi.fn();
  return {
    validateMock: validate,
    createSourceImageFileValidatorMock: vi.fn(() => ({
      validate,
    })),
  };
});

vi.mock("@/features/image-editor/lib/validate-source-image-file", () => ({
  createSourceImageFileValidator: createSourceImageFileValidatorMock,
}));

function makeImageFile(mimeType: string, name = "hero.png"): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type: mimeType });
}

describe("useImageDissolveTransition", () => {
  const setImageSrc = vi.fn();
  const setOriginalBytes = vi.fn();
  const setFileBaseName = vi.fn();
  const createObjectUrlMock = vi.fn(() => "blob:preview");
  const revokeObjectUrlMock = vi.fn();

  beforeEach(() => {
    validateMock.mockReset();
    createSourceImageFileValidatorMock.mockClear();
    setImageSrc.mockReset();
    setOriginalBytes.mockReset();
    setFileBaseName.mockReset();
    createObjectUrlMock.mockReset();
    revokeObjectUrlMock.mockReset();
    vi.stubGlobal("webflow", { notify: vi.fn() });
    vi.stubGlobal("URL", {
      createObjectURL: createObjectUrlMock,
      revokeObjectURL: revokeObjectUrlMock,
    });
  });

  it("does not create preview URL when validation fails", async () => {
    validateMock.mockResolvedValue({
      ok: false,
      errorCode: BEACON_IMAGE_ERROR_CODES.SOURCE_IMAGE_TYPE_NOT_ALLOWED,
    });
    const { result } = renderHook(() => useImageDissolveTransition({ setImageSrc, setOriginalBytes, setFileBaseName }));

    act(() => {
      result.current.queueFile(makeImageFile("image/tiff"));
    });

    await waitFor(() => {
      const wf = (globalThis as unknown as { webflow: { notify: ReturnType<typeof vi.fn> } }).webflow;
      expect(wf.notify).toHaveBeenCalledTimes(1);
    });
    expect(createObjectUrlMock).not.toHaveBeenCalled();
    expect(result.current.dissolving).toBe(false);
  });

  it("creates preview URL and enters dissolve when validation succeeds", async () => {
    validateMock.mockResolvedValue({
      ok: true,
      file: makeImageFile("image/png"),
      mimeType: "image/png",
      width: 1200,
      height: 800,
      megapixels: 0.96,
    });
    const { result } = renderHook(() => useImageDissolveTransition({ setImageSrc, setOriginalBytes, setFileBaseName }));

    act(() => {
      result.current.queueFile(makeImageFile("image/png"));
    });

    await waitFor(() => {
      expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
      expect(result.current.dissolving).toBe(true);
    });
  });
});
