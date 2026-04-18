import { initFeatures } from './utils/features';

/**
 * Main application entry point
 * Features are loaded conditionally using dynamic imports
 * Only features with matching DOM elements are initialized
 */
window.Webflow ||= [];
window.Webflow.push(() => {
  initFeatures([
    // Carousel feature - only loads if [data-slider-instance] exists
    ['[data-slider-instance]', () => import('./features/carousel')],

    // Add more features here as you build them:
    // ['[data-tabs]', () => import('./features/tabs')],
    // ['[data-modal]', () => import('./features/modal')],
    // ['[data-accordion]', () => import('./features/accordion')],
  ]);
});
