import { describe, expect, it } from "vitest";

import { isPermanentDesignerExchangeFailure } from "./beacon-tower-designer-exchange-policy";

describe("isPermanentDesignerExchangeFailure", () => {
  it("treats early access and Tower config errors as permanent", () => {
    expect(isPermanentDesignerExchangeFailure("early_access_required")).toBe(true);
    expect(isPermanentDesignerExchangeFailure("webflow_resolve_bearer_missing")).toBe(true);
    expect(isPermanentDesignerExchangeFailure("tower_not_configured")).toBe(true);
  });

  it("treats transient Designer and network errors as retryable", () => {
    expect(isPermanentDesignerExchangeFailure("get_id_token_failed")).toBe(false);
    expect(isPermanentDesignerExchangeFailure("id_token_resolve_failed")).toBe(false);
    expect(isPermanentDesignerExchangeFailure("Could not reach Tower")).toBe(false);
    expect(isPermanentDesignerExchangeFailure("http_503")).toBe(false);
  });

  it("treats other HTTP failures as permanent", () => {
    expect(isPermanentDesignerExchangeFailure("http_401")).toBe(true);
    expect(isPermanentDesignerExchangeFailure("http_403")).toBe(true);
  });
});
