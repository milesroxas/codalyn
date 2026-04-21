/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ExportEncodeSizeFootnote, ExportPresetLimitBar } from "./export-size-estimate";

describe("ExportPresetLimitBar", () => {
  it("exposes progressbar semantics and caps aria-valuenow", () => {
    render(<ExportPresetLimitBar estimatedBytes={500_000} maxBytes={1_000_000} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuemax", "1000000");
    expect(bar).toHaveAttribute("aria-valuenow", "500000");
  });
});

describe("ExportEncodeSizeFootnote", () => {
  it("prompts to crop when there is no crop", () => {
    render(
      <ExportEncodeSizeFootnote
        originalBytes={1000}
        estimatedBytes={null}
        estimatePending={false}
        completedCrop={null}
      />
    );
    expect(screen.getByText(/Crop first/)).toBeInTheDocument();
  });
});
