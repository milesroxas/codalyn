import { beforeEach, describe, expect, it } from "vitest";
import type { Rule } from "@/features/linter/model/rule.types";
import {
  createRuleConfigurationService,
  type StorageAdapter,
} from "@/features/linter/services/rule-configuration-service";

/** Minimal in-memory storage adapter for deterministic tests. */
function createMemoryStorage(initial: string | null = null): StorageAdapter & { value: string | null } {
  return {
    value: initial,
    read() {
      return this.value;
    },
    write(next: string) {
      this.value = next;
    },
  };
}

/** Build a minimal naming rule with an optional config schema. */
function makeRule(partial: Partial<Rule> & { id: string }): Rule {
  return {
    name: partial.id,
    description: "",
    type: "naming",
    severity: "warning",
    enabled: true,
    category: "format",
    targetClassTypes: ["custom"],
    test: () => true,
    ...partial,
  } as Rule;
}

const RULES: Rule[] = [
  makeRule({ id: "rule-a", severity: "warning" }),
  makeRule({
    id: "rule-b",
    severity: "error",
    config: {
      maxItems: { label: "Max", type: "number", default: 3 },
      mode: { label: "Mode", type: "enum", options: ["strict", "loose"], default: "strict" },
    },
  }),
];

const registry = { getAllRules: () => RULES };

describe("createRuleConfigurationService", () => {
  let storage: ReturnType<typeof createMemoryStorage>;

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  it("defaults to registry severity and schema defaults when nothing is stored", () => {
    const svc = createRuleConfigurationService(registry, { storage });
    const configs = svc.load();
    expect(configs.find((c) => c.ruleId === "rule-a")?.severity).toBe("warning");
    expect(configs.find((c) => c.ruleId === "rule-b")?.customSettings).toEqual({ maxItems: 3, mode: "strict" });
  });

  it("round-trips a severity override and persists only the diff from default", () => {
    const svc = createRuleConfigurationService(registry, { storage });
    const configs = svc.load().map((c) => (c.ruleId === "rule-a" ? { ...c, severity: "error" as const } : c));
    svc.save(configs);

    // Only the overridden rule is written; rule-b keeps its default and is absent.
    const persisted = JSON.parse(storage.value as string);
    expect(persisted.ruleSeverities).toEqual({ "rule-a": "error" });

    expect(svc.load().find((c) => c.ruleId === "rule-a")?.severity).toBe("error");
    expect(svc.getStoredSeverities()).toEqual({ "rule-a": "error" });
  });

  it("ignores malformed stored custom settings and falls back to schema defaults", () => {
    storage.write(
      JSON.stringify({
        version: 1,
        ruleConfigs: { "rule-b": { maxItems: "not-a-number", mode: "invalid-option", extra: 1 } },
      })
    );
    const svc = createRuleConfigurationService(registry, { storage });
    const ruleB = svc.load().find((c) => c.ruleId === "rule-b");
    // wrong type and out-of-range enum fall back to defaults; unknown key pruned
    expect(ruleB?.customSettings).toEqual({ maxItems: 3, mode: "strict" });
  });

  it("drops invalid severity values from storage", () => {
    storage.write(JSON.stringify({ version: 1, ruleConfigs: {}, ruleSeverities: { "rule-a": "nonsense" } }));
    const svc = createRuleConfigurationService(registry, { storage });
    expect(svc.getStoredSeverities()).toEqual({});
    expect(svc.load().find((c) => c.ruleId === "rule-a")?.severity).toBe("warning");
  });

  it("reads legacy v0 files without a version field", () => {
    storage.write(JSON.stringify({ enabledRules: ["rule-a"], ruleConfigs: {} }));
    const svc = createRuleConfigurationService(registry, { storage });
    const configs = svc.load();
    expect(configs.find((c) => c.ruleId === "rule-a")?.enabled).toBe(true);
    expect(configs.find((c) => c.ruleId === "rule-b")?.enabled).toBe(true); // no stored block → rule default
  });

  it("applies severity overrides on import", () => {
    const svc = createRuleConfigurationService(registry, { storage });
    const imported = svc.importConfiguration(
      JSON.stringify({ version: 1, ruleConfigs: {}, ruleSeverities: { "rule-b": "suggestion" } })
    );
    expect(imported.find((c) => c.ruleId === "rule-b")?.severity).toBe("suggestion");
  });
});
