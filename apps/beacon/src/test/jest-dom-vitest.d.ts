import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";

// vitest 4 declares the real `Assertion` interface in `@vitest/expect` and only
// re-exports it from `vitest`. jest-dom 6.x augments `declare module "vitest"`,
// which no longer merges onto the real interface, so its matchers are invisible
// to tsc. Augment the source module directly.
// `Assertion`'s default type parameter must match @vitest/expect's own
// `Assertion<T = any>` for declaration merging to apply.
declare module "@vitest/expect" {
  interface Assertion<T = any> extends TestingLibraryMatchers<unknown, T> {}
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers<unknown, unknown> {}
}
