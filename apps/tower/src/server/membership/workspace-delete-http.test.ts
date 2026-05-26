import { describe, expect, it } from "vitest";
import { workspaceDeletionErrorStatus } from "@/server/membership/workspace-delete-http";

describe("workspaceDeletionErrorStatus", () => {
  it("maps workspace deletion codes to HTTP statuses", () => {
    expect(workspaceDeletionErrorStatus("not_found")).toBe(404);
    expect(workspaceDeletionErrorStatus("forbidden")).toBe(403);
    expect(workspaceDeletionErrorStatus("confirm_mismatch")).toBe(400);
    expect(workspaceDeletionErrorStatus("deletion_incomplete")).toBe(503);
  });
});
