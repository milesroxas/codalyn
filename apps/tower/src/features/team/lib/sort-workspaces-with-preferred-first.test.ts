import { describe, expect, it } from "vitest";
import { sortWorkspacesWithPreferredFirst } from "@/features/team/lib/sort-workspaces-with-preferred-first";

describe("sortWorkspacesWithPreferredFirst", () => {
  const workspaces = [
    { id: "a", name: "Alpha" },
    { id: "b", name: "Beta" },
    { id: "c", name: "Gamma" },
  ];

  it("returns the same array when there is no preferred workspace", () => {
    expect(sortWorkspacesWithPreferredFirst(workspaces, undefined)).toBe(workspaces);
  });

  it("returns the same array when the preferred workspace is already first", () => {
    expect(sortWorkspacesWithPreferredFirst(workspaces, "a")).toBe(workspaces);
  });

  it("moves the preferred workspace to the front", () => {
    expect(sortWorkspacesWithPreferredFirst(workspaces, "c")).toEqual([
      { id: "c", name: "Gamma" },
      { id: "a", name: "Alpha" },
      { id: "b", name: "Beta" },
    ]);
  });

  it("returns a single-item list unchanged", () => {
    const one = [{ id: "solo", name: "Solo" }];
    expect(sortWorkspacesWithPreferredFirst(one, "solo")).toBe(one);
  });
});
