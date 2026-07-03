/**
 * Minimal stand-in for the `webflow` global that the Webflow Designer injects at runtime.
 *
 * Storybook runs in a plain browser, so that global does not exist. Every component under
 * `src/shared/ui` renders without it; this stub exists so feature-level stories (or components
 * that transitively reach a `webflow.*` call) fail soft with a console line instead of a
 * ReferenceError. Stories that need specific Designer data should install their own richer
 * mock via a story decorator — this stub deliberately returns nothing.
 */

type AnyFn = (...args: unknown[]) => unknown;

const LOG_PREFIX = "[storybook webflow stub]";

function createWebflowStub(): typeof webflow {
  const explicit: Record<string, AnyFn> = {
    notify: (options) => {
      console.info(`${LOG_PREFIX} webflow.notify`, options);
      return Promise.resolve();
    },
    subscribe: (event) => {
      console.info(`${LOG_PREFIX} webflow.subscribe(${String(event)}) — no events will fire`);
      return () => {};
    },
    setExtensionSize: () => Promise.resolve(),
  };

  return new Proxy(explicit, {
    get(target, prop) {
      if (typeof prop === "string" && prop in target) {
        return target[prop];
      }
      // Unknown Designer API: log the call and resolve to null so callers fail soft.
      return (...args: unknown[]) => {
        console.info(`${LOG_PREFIX} webflow.${String(prop)} called — returning null`, args);
        return Promise.resolve(null);
      };
    },
  }) as unknown as typeof webflow;
}

/** Installs the stub once, and never over an existing (real) `webflow` global. */
export function installWebflowStub(): void {
  const host = globalThis as { webflow?: typeof webflow };
  if (host.webflow !== undefined) {
    return;
  }
  host.webflow = createWebflowStub();
}
