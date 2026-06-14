import type { GrammarAdapter, ParsedClass } from "@/features/linter/model/linter.types";
import type { ClassType } from "@/features/linter/model/rule.types";

function getClassType(name: string): ClassType {
  if (name.startsWith("u-")) return "utility";
  if (name.startsWith("c-")) return "component";
  // Treat variant-like classes as combos even when incorrectly formatted
  // Matches: is-foo, is_bar, isActive
  const comboLike = /^(?:is[-_][A-Za-z0-9_]+|is[A-Z][A-Za-z0-9_]*)$/;
  if (comboLike.test(name)) return "combo";
  return "custom";
}

function lumosComponentKeyFromTokens(tokens: string[]): string | null {
  if (tokens.length < 2) {
    return tokens.length === 1 ? (tokens[0] ?? null) : null;
  }

  const lastToken = tokens[tokens.length - 1]?.toLowerCase();
  if (lastToken === "wrap" || lastToken === "wrapper") {
    const keyTokens = tokens.slice(0, -1);
    if (keyTokens.length >= 2) {
      return keyTokens.slice(0, 2).join("_");
    }
    if (keyTokens.length === 1) {
      return keyTokens[0];
    }
    return null;
  }

  return tokens.slice(0, 2).join("_");
}

function parseCustom(name: string): ParsedClass {
  const tokens = name.split("_").filter(Boolean);
  const parsed: ParsedClass = {
    raw: name,
    kind: "custom",
    tokens,
  };

  if (tokens.length > 0) {
    parsed.type = tokens[0];
  }
  if (tokens.length > 2) {
    parsed.variation = tokens.slice(1, -1).join("_") || undefined;
  }
  if (tokens.length >= 2) {
    parsed.elementToken = tokens[tokens.length - 1];
  }

  parsed.componentKey = tokens.length >= 2 ? lumosComponentKeyFromTokens(tokens) : null;

  return parsed;
}

export const lumosGrammar: GrammarAdapter = {
  id: "lumos",
  isCustomFirstRequired: true,
  utilityPrefix: "u-",
  componentPrefix: "c-",
  comboPrefix: "is-",
  elementSeparator: "_",
  parse(name: string): ParsedClass {
    const kind = getClassType(name);
    if (kind !== "custom") {
      return { raw: name, kind } as ParsedClass;
    }
    return parseCustom(name);
  },
};
