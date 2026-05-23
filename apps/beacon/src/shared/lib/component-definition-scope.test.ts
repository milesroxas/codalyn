import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  exitCurrentComponentIfAny,
  exitUntilPageForComponentEnter,
  withComponentDefinitionScope,
} from "@/shared/lib/component-definition-scope";

describe("component-definition-scope", () => {
  const exitComponent = vi.fn().mockResolvedValue(undefined);
  const enterComponent = vi.fn().mockResolvedValue(undefined);
  const getCurrentComponent = vi.fn().mockResolvedValue(null);
  const getRootElement = vi.fn();

  beforeEach(() => {
    exitComponent.mockClear();
    enterComponent.mockClear();
    getCurrentComponent.mockReset().mockResolvedValue(null);
    getRootElement.mockReset();
    vi.stubGlobal("webflow", {
      exitComponent,
      enterComponent,
      getCurrentComponent,
      getCurrentPage: vi.fn().mockRejectedValue(new Error("Missing current page!")),
      openCanvas: vi.fn().mockResolvedValue(undefined),
    });
  });

  it("exits until getCurrentComponent returns null", async () => {
    getCurrentComponent
      .mockResolvedValueOnce({ id: "nested" })
      .mockResolvedValueOnce({ id: "nested" })
      .mockResolvedValueOnce(null);

    await exitUntilPageForComponentEnter();

    expect(exitComponent).toHaveBeenCalledTimes(1);
  });

  it("runs fn inside enter/exit and passes definition root", async () => {
    const instance = { type: "ComponentInstance" } as ComponentElement;
    const definition = { getRootElement };
    const root = { type: "Block" };
    getCurrentComponent.mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValue(definition);
    getRootElement.mockResolvedValue(root);
    const getCurrentPage = vi.fn().mockResolvedValue({ id: "page_1" });
    vi.stubGlobal("webflow", {
      exitComponent,
      enterComponent,
      getCurrentComponent,
      getCurrentPage,
      openCanvas: vi.fn().mockResolvedValue(undefined),
    });

    const result = await withComponentDefinitionScope(instance, async (scope) => {
      expect(scope.definition).toBe(definition);
      expect(scope.definitionRoot).toBe(root);
      expect(scope.instance).toBe(instance);
      return "ok";
    });

    expect(result).toBe("ok");
    expect(enterComponent).toHaveBeenCalledWith(instance);
    expect(exitComponent).toHaveBeenCalledTimes(1);
  });

  it("calls onEnterFailed instead of throwing when enterComponent fails", async () => {
    enterComponent.mockRejectedValueOnce(new Error("forbidden"));
    const instance = { type: "ComponentInstance" } as ComponentElement;

    const result = await withComponentDefinitionScope(instance, async () => "inside", {
      onEnterFailed: () => "fallback",
    });

    expect(result).toBe("fallback");
    expect(exitComponent).not.toHaveBeenCalled();
  });

  it("exitCurrentComponentIfAny is a no-op when getCurrentComponent is missing", async () => {
    vi.stubGlobal("webflow", { exitComponent });
    await expect(exitCurrentComponentIfAny()).resolves.toBeUndefined();
    expect(exitComponent).not.toHaveBeenCalled();
  });
});
