import Swiper from 'swiper';

import { parseIX3Config, setupInteractionBridge } from './integration/interactionBridge';
import { buildCarouselConfig } from './model';
import type { CarouselDataset, CarouselInstance } from './types';

/**
 * Validate carousel element structure
 */
function isValidCarouselElement(element: HTMLElement): boolean {
  return !!element.querySelector('.swiper-wrapper');
}

/**
 * Create a carousel instance from an HTML element
 */
export function createCarousel(element: HTMLElement): CarouselInstance | null {
  if (!isValidCarouselElement(element)) {
    return null;
  }

  // Additional safety check: ensure element is connected to DOM
  if (!element.isConnected) {
    console.warn('[Carousel] Element not connected to DOM, skipping initialization');
    return null;
  }

  const dataset = element.dataset as CarouselDataset;
  const { modules, options } = buildCarouselConfig(element, dataset);

  try {
    // Parse IX3 configuration from dataset
    const ix3Config = parseIX3Config(dataset);

    // Create Swiper instance with init: false to setup IX3 first
    const swiper = new Swiper(element, {
      ...options,
      modules,
      init: false,
    });

    // Setup IX3 integration before initialization
    setupInteractionBridge(swiper, ix3Config);

    // Initialize swiper to trigger init event
    swiper.init();

    return {
      destroy: () => {
        try {
          swiper.destroy(true, true);
        } catch {
          // Silently handle destruction errors
        }
      },
      element,
    };
  } catch (error) {
    console.error('[Carousel] Failed to initialize:', error);
    return null;
  }
}
