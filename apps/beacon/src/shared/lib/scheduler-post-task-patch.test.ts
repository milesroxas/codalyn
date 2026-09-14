import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Pins the React scheduler patch (patches/scheduler@0.27.0.patch). Unpatched, `scheduler` yields to
 * the browser between render slices through a `MessageChannel` — `port.postMessage(null)` — which
 * Webflow's App Review Preflight flags as an "Insecure postMessage" (its rule fires on every
 * `postMessage(` call without a string-literal target origin; `MessagePort.postMessage` has no such
 * parameter). The patch replaces that branch with `scheduler.postTask()` (user-blocking priority),
 * keeping React's own `setTimeout` fallback for hosts without the Prioritized Task Scheduling API.
 * This test fails if a React/scheduler update drops the patch or a MessageChannel yield returns.
 */
describe("scheduler postTask patch", () => {
  // Resolve the copy react-dom actually bundles (the workspace also hoists an older scheduler that
  // nothing in Beacon's bundle uses).
  const require = createRequire(import.meta.url);
  const reactDomRequire = createRequire(require.resolve("react-dom/package.json"));
  const pkgRoot = path.dirname(reactDomRequire.resolve("scheduler/package.json"));
  const builds = ["scheduler.production.js", "scheduler.development.js"].map((name) => path.join(pkgRoot, "cjs", name));

  it.each(builds)("%s yields through scheduler.postTask, never a MessageChannel", (file) => {
    const source = readFileSync(file, "utf-8");
    expect(source).toContain("codalyn patch");
    expect(source).toContain("postTask");
    expect(source).toContain('priority: "user-blocking"');
    expect(source).not.toContain("MessageChannel");
    expect(source).not.toContain("postMessage");
    // React's last-resort timer fallback must survive for hosts without postTask (jsdom, Safari).
    expect(source).toContain("localSetTimeout(performWorkUntilDeadline, 0)");
  });
});
