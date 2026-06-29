/**
 * Per-open cache for Webflow component-**definition** reads (`getComponent`/`getName`/`getProps`/`getSettings`).
 *
 * These values are keyed by the stable component id and are identical for every instance of that component, yet the
 * composer-open path reads them once per *instance*. A slot list with N instances of one component therefore pays
 * `2N×getComponent + N×getName + N×getProps`, nearly all duplicates. Routing those reads through this cache collapses
 * each definition to a single fetch per component id — and the palette shares the same entries.
 *
 * Values are stored as Promises, not resolved data, so the concurrent fan-out in `handleOpenComposer` (Promise.all
 * over rows + palette) dedupes a single in-flight bridge call instead of racing N identical ones.
 *
 * Instance-level reads (`searchProps`, custom attributes) are deliberately NOT cached here — their values are
 * per-element and change independently of the component definition.
 *
 * Lifetime is one composer open: {@link clearCmsSlotComponentDefCache} is called at the start of every open so each
 * open reads current Designer state. The cache never spans a Designer edit, so it cannot serve a stale definition
 * (e.g. a prop newly exposed in the Designer always appears on the next open).
 */

const componentById = new Map<string, Promise<Component>>();
const nameById = new Map<string, Promise<string>>();
const propOrderById = new Map<string, Promise<string[] | undefined>>();
const settingsById = new Map<string, ReturnType<Component["getSettings"]>>();

/** Drops every cached definition. Call at the start of a composer open to guarantee fresh Designer reads. */
export function clearCmsSlotComponentDefCache(): void {
  componentById.clear();
  nameById.clear();
  propOrderById.clear();
  settingsById.clear();
}

/**
 * Records a handle already resolved via `instance.getComponent()` so a later {@link getCachedComponentById} for the
 * same id skips the round-trip. Existing entries (resolved or in-flight) win, so concurrent seeds never clobber.
 */
export function seedCachedComponent(component: Component): void {
  if (!componentById.has(component.id)) {
    componentById.set(component.id, Promise.resolve(component));
  }
}

/** Resolves a component by id, deduped against any in-flight fetch or prior {@link seedCachedComponent}. */
export function getCachedComponentById(componentId: string): Promise<Component> {
  let pending = componentById.get(componentId);
  if (pending === undefined) {
    pending = webflow.getComponent(componentId);
    componentById.set(componentId, pending);
  }
  return pending;
}

/** Component display name, keyed by `component.id`. */
export function cachedComponentName(component: Component): Promise<string> {
  let pending = nameById.get(component.id);
  if (pending === undefined) {
    pending = component.getName();
    nameById.set(component.id, pending);
  }
  return pending;
}

/** Webflow props-panel order (`getProps().map(id)`), keyed by `component.id`; `undefined` if the read fails. */
export function cachedComponentPropOrder(component: Component): Promise<string[] | undefined> {
  let pending = propOrderById.get(component.id);
  if (pending === undefined) {
    pending = component.getProps().then(
      (defs) => defs.map((d) => d.id),
      () => undefined
    );
    propOrderById.set(component.id, pending);
  }
  return pending;
}

/** Component settings (`group`, …), keyed by `component.id`. */
export function cachedComponentSettings(component: Component): ReturnType<Component["getSettings"]> {
  let pending = settingsById.get(component.id);
  if (pending === undefined) {
    pending = component.getSettings();
    settingsById.set(component.id, pending);
  }
  return pending;
}
