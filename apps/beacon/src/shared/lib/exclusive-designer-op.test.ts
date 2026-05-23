import { describe, expect, it } from "vitest";
import { runExclusiveDesignerOp } from "@/shared/lib/exclusive-designer-op";

describe("runExclusiveDesignerOp", () => {
  it("runs nested calls inline without queueing", async () => {
    const order: string[] = [];
    await runExclusiveDesignerOp(async () => {
      order.push("outer-start");
      await runExclusiveDesignerOp(async () => {
        order.push("inner");
      });
      order.push("outer-end");
    });
    expect(order).toEqual(["outer-start", "inner", "outer-end"]);
  });
});
