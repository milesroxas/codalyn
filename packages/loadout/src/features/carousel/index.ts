import "./styles.css";

import { createCarousel } from "./lib";

const CAROUSEL_SELECTOR = "[data-slider-instance]";

/**
 * Initialize all carousel instances on the page
 */
function initCarousel(): void {
  for (const element of document.querySelectorAll<HTMLElement>(CAROUSEL_SELECTOR)) {
    createCarousel(element);
  }
}

// Re-export domain-specific types only
export type { CarouselInstance } from "./types";
/** Feature loader entry point (see FeatureModule in utils/features.ts). */
export { initCarousel as init };
