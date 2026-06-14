import { describe, expect, it, vi } from "vitest";
import type { StorageAdapter } from "@/features/linter/services/storage/local-storage-adapter";
import { createTowerMirroringStorageAdapter } from "@/features/linter/services/storage/tower-mirroring-storage-adapter";

function memoryAdapter(): StorageAdapter & { value: string | null } {
  return {
    value: null,
    read() {
      return this.value;
    },
    write(v: string) {
      this.value = v;
    },
  };
}

/** Manual timer so debounce flush is deterministic in tests. */
function manualTimers() {
  let queued: (() => void) | null = null;
  return {
    setTimer: (fn: () => void) => {
      queued = fn;
      return 1 as unknown as ReturnType<typeof setTimeout>;
    },
    clearTimer: () => {
      queued = null;
    },
    flush: () => {
      queued?.();
    },
  };
}

describe("createTowerMirroringStorageAdapter", () => {
  it("read always delegates to the local base (offline source of truth)", () => {
    const base = memoryAdapter();
    base.write("local");
    const push = vi.fn();
    const adapter = createTowerMirroringStorageAdapter(base, { shouldMirror: () => true, push });
    expect(adapter.read()).toBe("local");
  });

  it("does NOT mirror when shouldMirror is false (free/offline tier)", () => {
    const base = memoryAdapter();
    const push = vi.fn();
    const t = manualTimers();
    const adapter = createTowerMirroringStorageAdapter(base, {
      shouldMirror: () => false,
      push,
      setTimer: t.setTimer,
      clearTimer: t.clearTimer,
    });
    adapter.write("x");
    t.flush();
    expect(base.value).toBe("x");
    expect(push).not.toHaveBeenCalled();
  });

  it("writes locally first, then mirrors after debounce when enabled", () => {
    const base = memoryAdapter();
    const push = vi.fn();
    const t = manualTimers();
    const adapter = createTowerMirroringStorageAdapter(base, {
      shouldMirror: () => true,
      push,
      setTimer: t.setTimer,
      clearTimer: t.clearTimer,
    });
    adapter.write("v1");
    expect(base.value).toBe("v1"); // local immediate
    expect(push).not.toHaveBeenCalled(); // push deferred
    t.flush();
    expect(push).toHaveBeenCalledExactlyOnceWith("v1");
  });

  it("coalesces rapid writes into a single push (last value wins)", () => {
    const base = memoryAdapter();
    const push = vi.fn();
    const t = manualTimers();
    const adapter = createTowerMirroringStorageAdapter(base, {
      shouldMirror: () => true,
      push,
      setTimer: t.setTimer,
      clearTimer: t.clearTimer,
    });
    adapter.write("a");
    adapter.write("b");
    adapter.write("c");
    t.flush();
    expect(push).toHaveBeenCalledExactlyOnceWith("c");
  });

  it("swallows push errors (local write already succeeded)", () => {
    const base = memoryAdapter();
    const t = manualTimers();
    const adapter = createTowerMirroringStorageAdapter(base, {
      shouldMirror: () => true,
      push: () => {
        throw new Error("network down");
      },
      setTimer: t.setTimer,
      clearTimer: t.clearTimer,
    });
    adapter.write("v");
    expect(() => t.flush()).not.toThrow();
    expect(base.value).toBe("v");
  });
});
