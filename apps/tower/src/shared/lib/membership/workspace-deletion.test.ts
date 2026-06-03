import { describe, expect, it } from "vitest";
import {
  OPERATOR_WORKSPACE_PURGE_CONFIRM_PHRASE,
  operatorWorkspacePurgePhraseMatches,
} from "@/shared/lib/membership/workspace-deletion";

describe("operatorWorkspacePurgePhraseMatches", () => {
  it("accepts PURGE case-insensitively with surrounding whitespace", () => {
    expect(operatorWorkspacePurgePhraseMatches("purge")).toBe(true);
    expect(operatorWorkspacePurgePhraseMatches(`  ${OPERATOR_WORKSPACE_PURGE_CONFIRM_PHRASE}  `)).toBe(true);
  });

  it("rejects missing or wrong phrase", () => {
    expect(operatorWorkspacePurgePhraseMatches("")).toBe(false);
    expect(operatorWorkspacePurgePhraseMatches("DELETE")).toBe(false);
  });
});
