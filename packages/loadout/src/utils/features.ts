/**
 * Feature initialization utilities
 * Implements conditional loading pattern for optimal performance
 * Only loads and initializes features when their DOM elements exist
 */

/**
 * Feature module interface
 * All feature modules must export an init function
 */
export interface FeatureModule {
  init: () => void;
}

/**
 * Conditionally initialize a feature based on DOM presence
 * Uses dynamic imports to code-split features
 *
 * @param selector - CSS selector to check for feature presence
 * @param loader - Dynamic import function that returns the feature module
 * @returns Promise that resolves when feature is initialized (or immediately if not needed)
 *
 * @example
 * ```ts
 * initFeature(
 *   '[data-slider-instance]',
 *   () => import('./features/carousel')
 * );
 * ```
 */
export async function initFeature(
  selector: string,
  loader: () => Promise<FeatureModule>
): Promise<void> {
  // Early return if feature elements don't exist
  if (!document.querySelector(selector)) {
    return;
  }

  try {
    const module = await loader();
    module.init();
  } catch (error) {
    console.error(`Failed to initialize feature for selector "${selector}":`, error);
  }
}

/**
 * Initialize multiple features in parallel
 * More efficient than sequential initialization
 *
 * @param features - Array of [selector, loader] tuples
 * @returns Promise that resolves when all features are initialized
 *
 * @example
 * ```ts
 * initFeatures([
 *   ['[data-slider-instance]', () => import('./features/carousel')],
 *   ['[data-tabs]', () => import('./features/tabs')],
 *   ['[data-modal]', () => import('./features/modal')],
 * ]);
 * ```
 */
export async function initFeatures(
  features: Array<[string, () => Promise<FeatureModule>]>
): Promise<void> {
  await Promise.all(features.map(([selector, loader]) => initFeature(selector, loader)));
}
