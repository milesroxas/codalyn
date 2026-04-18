import { EffectFade, Navigation, Pagination } from 'swiper/modules';
import type { SwiperModule, SwiperOptions } from 'swiper/types';

import type { CarouselDataset } from './types';

export interface CarouselConfig {
  modules: SwiperModule[];
  options: SwiperOptions;
}

/**
 * Parse string to boolean following Webflow attribute conventions
 * Empty string or 'true' evaluates to true
 */
function parseBoolean(value: string | undefined): boolean {
  return value === '' || value === 'true';
}

/**
 * Parse string to number with fallback
 */
function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Parse string to number or "auto"
 */
function parseNumberOrAuto(value: string | undefined, fallback: number): number | 'auto' {
  if (value === 'auto') return 'auto';
  return parseNumber(value, fallback);
}

/**
 * Parse JSON string to breakpoints object
 * Safely handles invalid JSON by returning undefined
 */
function parseBreakpoints(value: string | undefined): SwiperOptions['breakpoints'] {
  if (!value) return undefined;

  try {
    const parsed = JSON.parse(value);
    // Validate that it's an object with numeric keys
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as SwiperOptions['breakpoints'];
    }
  } catch {
    console.warn('Invalid breakpoints JSON:', value);
  }

  return undefined;
}

/**
 * Parse individual breakpoint attributes (data-breakpoint-320, data-breakpoint-640, etc.)
 * and build a breakpoints object
 * Supports both double quotes and single quotes for Webflow compatibility
 */
function parseIndividualBreakpoints(element: HTMLElement): SwiperOptions['breakpoints'] {
  const breakpoints: SwiperOptions['breakpoints'] = {};
  const attributes = element.attributes;

  for (let i = 0; i < attributes.length; i++) {
    const attr = attributes[i];
    const match = attr.name.match(/^data-breakpoint-(\d+)$/);

    if (match) {
      const width = parseInt(match[1], 10);
      const value = attr.value;

      try {
        // Convert single quotes to double quotes for JSON parsing (Webflow compatibility)
        const normalizedValue = value.replace(/'/g, '"');

        // Parse the JSON value for this breakpoint
        const config = JSON.parse(normalizedValue);
        if (typeof config === 'object' && config !== null) {
          breakpoints[width] = config;
        }
      } catch {
        console.warn(`Invalid breakpoint config for ${attr.name}:`, value);
      }
    }
  }

  return Object.keys(breakpoints).length > 0 ? breakpoints : undefined;
}

/**
 * Find element by selector or attribute
 * Supports both CSS selectors and data attribute values
 * Searches within container first, then expands to document level
 */
function findElement(
  container: HTMLElement,
  selectorOrAttribute: string | undefined,
  fallbackSelector: string
): HTMLElement | null {
  if (!selectorOrAttribute) {
    // Use fallback class-based selector (container only)
    return container.querySelector<HTMLElement>(fallbackSelector);
  }

  // First try as a data attribute value within container
  const attributeSelector = `[data-carousel-element="${selectorOrAttribute}"]`;
  let byAttribute = container.querySelector<HTMLElement>(attributeSelector);

  // If not found in container, search document
  if (!byAttribute) {
    byAttribute = document.querySelector<HTMLElement>(attributeSelector);
  }

  if (byAttribute) return byAttribute;

  // Then try as a CSS selector within container
  try {
    let byCSSSelector = container.querySelector<HTMLElement>(selectorOrAttribute);

    // If not found in container, search document
    if (!byCSSSelector) {
      byCSSSelector = document.querySelector<HTMLElement>(selectorOrAttribute);
    }

    return byCSSSelector;
  } catch {
    return null;
  }
}

/**
 * Build navigation configuration
 * Supports attribute-based element assignment
 */
function buildNavigationConfig(
  element: HTMLElement,
  dataset: CarouselDataset
): SwiperOptions['navigation'] {
  const nextButton = findElement(element, dataset.navNext, '.slider-next');
  const prevButton = findElement(element, dataset.navPrev, '.slider-prev');

  if (nextButton && prevButton) {
    return {
      nextEl: nextButton,
      prevEl: prevButton,
    };
  }

  return undefined;
}

/**
 * Build pagination configuration
 * Supports attribute-based element assignment
 */
function buildPaginationConfig(
  element: HTMLElement,
  dataset: CarouselDataset
): SwiperOptions['pagination'] {
  const paginationEl = findElement(element, dataset.pagination, '.swiper-pagination');

  if (paginationEl) {
    return {
      clickable: true,
      el: paginationEl,
    };
  }

  return undefined;
}

/**
 * Build Swiper configuration from element dataset
 * Implements DDD principles with clear domain logic separation
 * Returns both the config and required modules to avoid global registration issues
 */
export function buildCarouselConfig(
  element: HTMLElement,
  dataset: CarouselDataset
): CarouselConfig {
  const effect = dataset.effect as SwiperOptions['effect'];

  const centeredSlides = parseBoolean(dataset.centeredSlides);
  const loop = dataset.loop !== undefined ? parseBoolean(dataset.loop) : true;

  const config: SwiperOptions = {
    effect: effect ?? 'slide',
    loop,
    slidesPerView: parseNumberOrAuto(dataset.slidesPerView, 1),
    spaceBetween: parseNumber(dataset.spaceBetween, 0),
    centeredSlides,
    // When centered, start at first slide (index 0) to ensure first slide is centered
    initialSlide: centeredSlides ? 0 : undefined,
    // No swiping configuration - allows preventing swipe on specific elements
    noSwiping: true,
    noSwipingClass: 'swiper-no-swiping',
    noSwipingSelector: dataset.noSwipingSelector ?? '[data-no-swiping]',
  };

  const modules: SwiperModule[] = [];

  // Fade effect configuration
  if (effect === 'fade') {
    config.fadeEffect = {
      crossFade: parseBoolean(dataset.crossfade),
    };
    modules.push(EffectFade);
  }

  // Navigation controls (attribute-based)
  const navigation = buildNavigationConfig(element, dataset);
  if (navigation) {
    config.navigation = navigation;
    modules.push(Navigation);
  }

  // Pagination (attribute-based)
  const pagination = buildPaginationConfig(element, dataset);
  if (pagination) {
    config.pagination = pagination;
    modules.push(Pagination);
  }

  // Responsive breakpoints
  // Try JSON attribute first, then fall back to individual breakpoint attributes
  let breakpoints = parseBreakpoints(dataset.breakpoints);
  if (!breakpoints) {
    breakpoints = parseIndividualBreakpoints(element);
  }
  if (breakpoints) {
    config.breakpoints = breakpoints;
  }

  return { modules, options: config };
}
