/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const emptyList = { items: [], loading: false, error: null };

vi.mock("@/features/cms-slots/model/use-cms-slot-link-targets", () => ({
  useLinkPickerPages: () => emptyList,
  useLinkPickerCollections: () => emptyList,
  useLinkPickerEntries: () => emptyList,
  useCurrentTemplateCollectionId: () => null,
  useCurrentPageId: () => null,
}));

import { ComposerLinkField } from "./composer-link-field";

function renderField(value: string) {
  const onChange = vi.fn<(v: string) => void>();
  render(<ComposerLinkField inputId="link-test" value={value} busy={false} onChange={onChange} />);
  return { onChange };
}

describe("ComposerLinkField", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts on the URL tab with new-tab on, and emits a bare url while new-tab stays off", () => {
    const { onChange } = renderField("https://existing.example"); // legacy bare → new-tab off
    const input = screen.getByPlaceholderText("https://…");
    expect(input).toHaveValue("https://existing.example");

    fireEvent.change(input, { target: { value: "https://next.example" } });
    expect(onChange).toHaveBeenLastCalledWith("https://next.example");
  });

  it("encodes the new-tab flag into a json envelope for external urls", () => {
    const { onChange } = renderField(""); // empty → external, new-tab default ON
    fireEvent.change(screen.getByPlaceholderText("https://…"), { target: { value: "https://x.com" } });
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(JSON.parse(lastCall)).toEqual({ k: "url", h: "https://x.com", t: 1 });
  });

  it("toggling new tab off then editing emits a bare url", () => {
    const { onChange } = renderField("");
    fireEvent.click(screen.getByRole("switch", { name: /open in new tab/i }));
    // newTab now false; the toggle itself emits "" (no href yet)
    expect(onChange).toHaveBeenLastCalledWith("");
    fireEvent.change(screen.getByPlaceholderText("https://…"), { target: { value: "https://x.com" } });
    expect(onChange).toHaveBeenLastCalledWith("https://x.com");
  });

  it("switching to the Page tab clears the value to an unset link", () => {
    const { onChange } = renderField("https://x.com");
    fireEvent.click(screen.getByRole("radio", { name: "Page" }));
    expect(onChange).toHaveBeenLastCalledWith("");
    // The page picker trigger is now shown.
    expect(screen.getByRole("combobox", { name: /select a page/i })).toBeInTheDocument();
  });

  it("hydrates a saved CMS link onto the CMS tab", () => {
    renderField(JSON.stringify({ k: "cms", h: "/blog/post", c: "col-1", e: "item-9" }));
    expect(screen.getByRole("combobox", { name: /select a cms collection$/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /entry/i })).toBeInTheDocument();
  });
});
