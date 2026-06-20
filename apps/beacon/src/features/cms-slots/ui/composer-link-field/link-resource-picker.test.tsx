/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LinkResourcePicker } from "./link-resource-picker";

const OPTIONS = [
  { id: "p1", name: "Home", path: "/" },
  { id: "p2", name: "About", path: "/about" },
];

function renderPicker(overrides: Partial<React.ComponentProps<typeof LinkResourcePicker>> = {}) {
  const onSelect = vi.fn();
  render(
    <LinkResourcePicker
      options={OPTIONS}
      selectedId={null}
      onSelect={onSelect}
      loading={false}
      error={null}
      placeholder="Select a page…"
      searchPlaceholder="Search pages…"
      emptyText="No pages found."
      ariaLabel="Select a page to link to"
      {...overrides}
    />
  );
  fireEvent.click(screen.getByRole("combobox", { name: /select a page/i }));
  return { onSelect };
}

describe("LinkResourcePicker disabledOptionId", () => {
  it("renders the matching option disabled with its hint and blocks selection", () => {
    const { onSelect } = renderPicker({ disabledOptionId: "p1", disabledOptionHint: "Current page" });

    const current = screen.getByRole("option", { name: /home/i });
    expect(current).toBeDisabled();
    expect(current).toHaveAttribute("aria-disabled", "true");
    expect(current).toHaveTextContent("Current page");

    fireEvent.click(current);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("leaves every option selectable when no disabledOptionId is given", () => {
    const { onSelect } = renderPicker();

    const about = screen.getByRole("option", { name: /about/i });
    expect(about).not.toBeDisabled();
    fireEvent.click(about);
    expect(onSelect).toHaveBeenCalledWith(OPTIONS[1]);
  });
});
