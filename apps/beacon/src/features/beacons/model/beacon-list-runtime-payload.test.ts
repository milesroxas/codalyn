import { describe, expect, it } from "vitest";
import {
  BEACON_LIST_RUNTIME_JSON_VERSION,
  beaconListRuntimePayloadSequential,
  parseBeaconListRuntimePayload,
  serializeBeaconListRuntimePayload,
} from "@/features/beacons/model/beacon-list-runtime-payload";

describe("beaconListRuntimePayloadSequential", () => {
  it("serializes identity order for N children", () => {
    expect(JSON.parse(beaconListRuntimePayloadSequential(3))).toEqual({
      v: BEACON_LIST_RUNTIME_JSON_VERSION,
      i: [0, 1, 2],
      p: [{}, {}, {}],
    });
  });
});

describe("parseBeaconListRuntimePayload", () => {
  it("returns null for empty or invalid", () => {
    expect(parseBeaconListRuntimePayload("")).toBeNull();
    expect(parseBeaconListRuntimePayload("not json")).toBeNull();
    expect(parseBeaconListRuntimePayload('{"v":3,"i":[0]}')).toBeNull();
  });

  it("round-trips and drops out-of-range indices when child count is set", () => {
    const s = serializeBeaconListRuntimePayload([1, 0, 2], [{ a: "x" }, {}, { y: "z" }]);
    const a = parseBeaconListRuntimePayload(s);
    expect(a).toEqual({ v: BEACON_LIST_RUNTIME_JSON_VERSION, i: [1, 0, 2], p: [{ a: "x" }, {}, { y: "z" }] });
    const b = parseBeaconListRuntimePayload(s, 2);
    expect(b?.i).toEqual([1, 0]);
    expect(b?.p).toEqual([{ a: "x" }, {}]);
  });

  it("accepts v1 payload without p", () => {
    const p = parseBeaconListRuntimePayload('{"v":1,"i":[0,1]}');
    expect(p).toEqual({ v: BEACON_LIST_RUNTIME_JSON_VERSION, i: [0, 1], p: [{}, {}] });
  });

  it("accepts string v like CMS round-trips sometimes emit", () => {
    const p = parseBeaconListRuntimePayload('{"v":"2","i":[0],"p":[{"a":"x"}]}');
    expect(p).toEqual({
      v: BEACON_LIST_RUNTIME_JSON_VERSION,
      i: [0],
      p: [{ a: "x" }],
    });
  });

  it("serializes empty strings in p so CMS + runtime can clear overrides", () => {
    const s = serializeBeaconListRuntimePayload([0, 1], [{ "prop-a": "hello", "prop-b": "" }, { x: "0" }]);
    const parsed = parseBeaconListRuntimePayload(s);
    expect(parsed).toEqual({
      v: BEACON_LIST_RUNTIME_JSON_VERSION,
      i: [0, 1],
      p: [{ "prop-a": "hello", "prop-b": "" }, { x: "0" }],
    });
  });
});
