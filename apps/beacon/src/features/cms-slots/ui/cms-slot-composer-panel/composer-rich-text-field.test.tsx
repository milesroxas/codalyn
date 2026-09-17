/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ComposableInstancePropMeta } from "@/features/cms-slots/model/cms-slot-composable-props";
import { ComposerRichTextField } from "./composer-rich-text-field";

const EP: ComposableInstancePropMeta = { propId: "body", label: "Body", valueType: "richText" };

/**
 * Reduced form shipped in every Marketplace bundle (`VITE_BEACON_RICH_TEXT_EDITOR_ENABLED` unset, so
 * `__BEACON_RICH_TEXT_EDITOR_ENABLED__` is false and Lexical is dead-code-eliminated — App Review
 * Preflight "Silent Canvas Mutations", compliance doc R8.8). Vitest pins the build constant on so the
 * editor's own tests keep exercising it, so the state is passed explicitly here, exactly as the
 * telemetry-off panel variants do.
 */
describe("ComposerRichTextField without the rich-text editor", () => {
  function renderReduced(value: string, busy = false) {
    const onChange = vi.fn<(v: string) => void>();
    render(
      <ComposerRichTextField
        inputId="body-test"
        ep={EP}
        value={value}
        busy={busy}
        onChange={onChange}
        richTextEditorAvailable={false}
      />
    );
    return { onChange };
  }

  it("edits the prop's HTML in an editable textarea labelled by the prop", () => {
    renderReduced("<p>hello</p>");
    const field = screen.getByLabelText("Body");
    expect(field.tagName).toBe("TEXTAREA");
    expect(field).toHaveValue("<p>hello</p>");
    expect(field).not.toBeDisabled();
  });

  it("passes the raw HTML string through onChange unchanged (sanitization stays at the model boundary)", () => {
    const { onChange } = renderReduced("");
    fireEvent.change(screen.getByLabelText("Body"), { target: { value: "<p>typed</p>" } });
    expect(onChange).toHaveBeenCalledWith("<p>typed</p>");
  });

  it("disables the field while the composer is busy", () => {
    renderReduced("<p>hello</p>", true);
    expect(screen.getByLabelText("Body")).toBeDisabled();
  });
});
