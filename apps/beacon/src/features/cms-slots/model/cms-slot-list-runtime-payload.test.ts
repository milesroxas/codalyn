import { describe, expect, it } from "vitest";
import {
  CMS_SLOT_LIST_RUNTIME_JSON_VERSION,
  cmsSlotListRuntimePayloadSequential,
  parseCmsSlotListRuntimePayload,
  serializeCmsSlotListRuntimePayload,
} from "@/features/cms-slots/model/cms-slot-list-runtime-payload";

describe("cmsSlotListRuntimePayloadSequential", () => {
  it("serializes identity order for N children", () => {
    expect(JSON.parse(cmsSlotListRuntimePayloadSequential(3))).toEqual({
      v: CMS_SLOT_LIST_RUNTIME_JSON_VERSION,
      i: [0, 1, 2],
      p: [{}, {}, {}],
    });
  });
});

describe("parseCmsSlotListRuntimePayload", () => {
  it("returns null for empty or invalid", () => {
    expect(parseCmsSlotListRuntimePayload("")).toBeNull();
    expect(parseCmsSlotListRuntimePayload("not json")).toBeNull();
    expect(parseCmsSlotListRuntimePayload('{"v":3,"i":[0]}')).toBeNull();
  });

  it("round-trips parallel slot labels in n", () => {
    const s = serializeCmsSlotListRuntimePayload([0, 1], [{ a: "" }, {}], ["Alpha", "Beta"]);
    const a = parseCmsSlotListRuntimePayload(s);
    expect(a).toEqual({
      v: CMS_SLOT_LIST_RUNTIME_JSON_VERSION,
      i: [0, 1],
      p: [{ a: "" }, {}],
      n: ["Alpha", "Beta"],
    });
  });

  it("round-trips and drops out-of-range indices when child count is set", () => {
    const s = serializeCmsSlotListRuntimePayload([1, 0, 2], [{ a: "x" }, {}, { y: "z" }], ["L1", "L2", "L3"]);
    const a = parseCmsSlotListRuntimePayload(s);
    expect(a).toEqual({
      v: CMS_SLOT_LIST_RUNTIME_JSON_VERSION,
      i: [1, 0, 2],
      p: [{ a: "x" }, {}, { y: "z" }],
      n: ["L1", "L2", "L3"],
    });
    const b = parseCmsSlotListRuntimePayload(s, 2);
    expect(b?.i).toEqual([1, 0]);
    expect(b?.p).toEqual([{ a: "x" }, {}]);
    expect(b?.n).toEqual(["L1", "L2"]);
  });

  it("accepts v1 payload without p", () => {
    const p = parseCmsSlotListRuntimePayload('{"v":1,"i":[0,1]}');
    expect(p).toEqual({ v: CMS_SLOT_LIST_RUNTIME_JSON_VERSION, i: [0, 1], p: [{}, {}] });
  });

  it("accepts string v like CMS round-trips sometimes emit", () => {
    const p = parseCmsSlotListRuntimePayload('{"v":"2","i":[0],"p":[{"a":"x"}]}');
    expect(p).toEqual({
      v: CMS_SLOT_LIST_RUNTIME_JSON_VERSION,
      i: [0],
      p: [{ a: "x" }],
    });
  });

  it("serializes empty strings in p so CMS + runtime can clear overrides", () => {
    const s = serializeCmsSlotListRuntimePayload([0, 1], [{ "prop-a": "hello", "prop-b": "" }, { x: "0" }]);
    const parsed = parseCmsSlotListRuntimePayload(s);
    expect(parsed).toEqual({
      v: CMS_SLOT_LIST_RUNTIME_JSON_VERSION,
      i: [0, 1],
      p: [{ "prop-a": "hello", "prop-b": "" }, { x: "0" }],
    });
  });
});
