import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Pins the @radix-ui/react-focus-scope patch (patches/@radix-ui__react-focus-scope@1.1.7.patch).
 * Upstream's trapped FocusScope installs a MutationObserver on the scope to refocus the container
 * when the focused element is removed. Webflow's App Review Preflight ("Silent Canvas Mutations",
 * 2026-09-14) flags every MutationObserver in a shipped bundle, so the patch moves that recovery
 * into the existing focusin/focusout handlers (target disconnected → refocus container). This
 * test fails if a dependency update drops the patch or the observer comes back.
 *
 * The package is reached through `radix-ui` (Beacon's dependency), the same way the bundle does.
 */
describe("@radix-ui/react-focus-scope patch", () => {
  // Both packages hide package.json behind `exports`, so walk from their resolved entry files.
  const require = createRequire(import.meta.url);
  const radixEntry = require.resolve("radix-ui");
  const radixRoot = radixEntry.slice(0, radixEntry.lastIndexOf(`${path.sep}radix-ui${path.sep}`) + "/radix-ui".length);
  const focusScopeDist = path.dirname(
    createRequire(path.join(radixRoot, "package.json")).resolve("@radix-ui/react-focus-scope")
  );

  it.each(["index.js", "index.mjs"])("dist/%s installs no DOM observer and keeps the focus trap", (rel) => {
    const source = readFileSync(path.join(focusScopeDist, rel), "utf-8");
    expect(source).not.toContain("MutationObserver");
    expect(source).toContain("codalyn patch");
    // The trap itself is intact.
    expect(source).toContain('document.addEventListener("focusin"');
    expect(source).toContain('document.addEventListener("focusout"');
    // The replacement recovery path: a removed target refocuses the container.
    expect(source).toContain("target.isConnected");
    expect(source).toContain("last && last.isConnected ? last : container");
  });
});
