/**
 * Serializes Designer mutations that conflict when overlapped (`createStyle`, `setProperties`,
 * `setStyles`, `registerComponent`, `enterComponent` / prop edits, etc.).
 *
 * **Re-entrant:** nested calls run inline so a wider critical section can call helpers without deadlocking.
 */
let chain: Promise<void> = Promise.resolve();
let depth = 0;

export function runExclusiveDesignerOp<T>(fn: () => Promise<T>): Promise<T> {
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
