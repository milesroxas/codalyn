/** @vitest-environment jsdom */

import { act, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { RichTextEditor } from "@/shared/ui/rich-text-editor/rich-text-editor";

describe("<RichTextEditor> (controlled value)", () => {
  it("renders the toolbar and hydrates the initial HTML value", async () => {
    render(<RichTextEditor value="<p>hello world</p>" onChange={vi.fn()} aria-label="Body" />);

    // Toolbar chrome is present.
    expect(screen.getByLabelText("Bold")).toBeInTheDocument();
    // Initial value is imported into the editable surface.
    const editable = screen.getByLabelText("Body");
    await waitFor(() => expect(editable.textContent).toContain("hello world"));
  });

  it("imports a new external value without remounting", async () => {
    function Harness() {
      const [value, setValue] = useState("<p>first</p>");
      return (
        <>
          <button type="button" onClick={() => setValue("<p>second</p>")}>
            change
          </button>
          <RichTextEditor value={value} onChange={vi.fn()} aria-label="Body" />
        </>
      );
    }
    render(<Harness />);
    const editable = screen.getByLabelText("Body");
    await waitFor(() => expect(editable.textContent).toContain("first"));

    act(() => {
      screen.getByText("change").click();
    });
    await waitFor(() => expect(editable.textContent).toContain("second"));
    expect(editable.textContent).not.toContain("first");
  });

  it("disables the editable surface when disabled", async () => {
    render(<RichTextEditor value="<p>x</p>" onChange={vi.fn()} disabled aria-label="Body" />);
    const editable = screen.getByLabelText("Body");
    await waitFor(() => expect(editable.getAttribute("contenteditable")).toBe("false"));
  });
});
