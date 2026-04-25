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
    });
  });
});

describe("parseBeaconListRuntimePayload", () => {
  it("returns null for empty or invalid", () => {
    expect(parseBeaconListRuntimePayload("")).toBeNull();
    expect(parseBeaconListRuntimePayload("not json")).toBeNull();
    expect(parseBeaconListRuntimePayload('{"v":2,"i":[0]}')).toBeNull();
  });

  it("round-trips and drops out-of-range indices when child count is set", () => {
    const s = serializeBeaconListRuntimePayload([1, 0, 2]);
    const a = parseBeaconListRuntimePayload(s);
    expect(a).toEqual({ v: 1, i: [1, 0, 2] });
    const b = parseBeaconListRuntimePayload(s, 2);
    expect(b?.i).toEqual([1, 0]);
  });
});
