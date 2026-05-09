/**
 * Runs Designer style / class-binding work one at a time. Overlapping `createStyle`, `setProperties`, `setStyles`, and
 * `registerComponent` can surface Webflow errors like `[Conflict] The operation could not be applied to the style block store`.
 *
 * **Re-entrant:** nested calls run inline so a wider critical section (e.g. create list target) can call `ensure*` without
 * deadlocking the queue.
 */
let chain: Promise<void> = Promise.resolve();
let depth = 0;

export function runExclusiveDesignerStyleOp<T>(fn: () => Promise<T>): Promise<T> {
  if (depth > 0) {
    return fn();
  }
  const run = chain.then(async () => {
    depth += 1;
    try {
      return await fn();
    } finally {
      depth -= 1;
    }
  });
  chain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}
