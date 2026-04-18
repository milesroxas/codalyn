/**
 * Carousel Interaction Bridge Adapter
 *
 * Translates Swiper lifecycle events into:
 * - Shared DOM state contract (data-state attributes)
 * - Shared event emission (IX3 custom events)
 *
 * This adapter is domain-focused and owns the mapping between Swiper's API
 * and the shared interaction bridge contract.
 * This will be deprecated in favor of the new interaction bridge.
 */

import type Swiper from 'swiper';

import { emit, setState } from '../../../shared/interaction-bridge';

/**
 * Configuration for IX3 integration
 */
export interface IX3Config {
  /** Feature ID for scoping (e.g., 'hero', 'testimonials') */
  featureId?: string;
  /** Whether to emit interaction events (default: true) */
  enabled?: boolean;
  /** Custom event prefix (default: 'interaction') */
  eventPrefix?: string;
  /** Custom start event name (overrides prefix) */
  eventStart?: string;
  /** Custom end event name (overrides prefix) */
  eventEnd?: string;
}

/**
 * Calculate prev/next indices with looping support
 */
function calculateIndices(
  activeIndex: number,
  totalSlides: number,
  loop: boolean
): { prev: number | undefined; next: number | undefined } {
  if (loop) {
    // Handle single slide edge case - no prev/next for a single slide
    if (totalSlides === 1) {
      return { prev: undefined, next: undefined };
    }

    // With loop enabled, wrap around
    const prev = (activeIndex - 1 + totalSlides) % totalSlides;
    const next = (activeIndex + 1) % totalSlides;
    return { prev, next };
  }

  // Without loop, only set prev/next if they're different from active
  // This prevents the same slide from having multiple states
  const prev = activeIndex > 0 ? activeIndex - 1 : undefined;
  const next = activeIndex < totalSlides - 1 ? activeIndex + 1 : undefined;
  return { prev, next };
}

/**
 * Apply state markers to slides based on Swiper's active index
 */
function applySlideStates(swiper: Swiper): void {
  // Get all slides from the wrapper (excludes duplicate slides in loop mode)
  const wrapper = swiper.wrapperEl;
  const slides = wrapper
    ? Array.from(wrapper.querySelectorAll('.swiper-slide:not(.swiper-slide-duplicate)'))
    : [];

  // Safety check for empty carousel
  if (!slides || slides.length === 0) {
    return;
  }

  const realIndex = swiper.realIndex; // Use realIndex for looping carousels
  const totalSlides = slides.length;
  const loop = swiper.params.loop || false;

  const { prev, next } = calculateIndices(realIndex, totalSlides, loop);

  setState(slides, {
    active: realIndex,
    prev,
    next,
  });
}

/**
 * Get event names based on configuration
 */
function getEventNames(config: IX3Config): { start: string; end: string } {
  // Use prefix to build default event names
  const prefix = config.eventPrefix || 'interaction';
  const defaultStart = `${prefix}:state-change:start`;
  const defaultEnd = `${prefix}:state-change:end`;

  // Allow custom event names to override defaults
  return {
    start: config.eventStart || defaultStart,
    end: config.eventEnd || defaultEnd,
  };
}

/**
 * Setup IX3 integration for a Swiper instance
 *
 * This is the main adapter function that connects Swiper to the interaction bridge.
 * It listens to Swiper events and translates them into:
 * - DOM state markers (data-state)
 * - IX3 custom events
 *
 * @param swiper - Swiper instance to integrate
 * @param config - IX3 configuration
 *
 * @example
 * ```ts
 * const swiper = new Swiper(element, options);
 * setupInteractionBridge(swiper, {
 *   featureId: 'hero',
 *   eventPrefix: 'carousel'
 * });
 * ```
 */
export function setupInteractionBridge(swiper: Swiper, config: IX3Config = {}): void {
  // Skip if not explicitly enabled (opt-in behavior)
  if (config.enabled !== true) {
    return;
  }

  const eventNames = getEventNames(config);

  // Apply initial state markers BEFORE init to prevent CSS transition on first slide
  // This ensures the first slide starts with data-state="active" already applied
  swiper.on('beforeInit', () => {
    applySlideStates(swiper);
  });

  // Emit init event after Swiper is ready
  swiper.on('init', () => {
    emit('init', {
      featureId: config.featureId,
      type: 'carousel',
    });
  });

  // Update state markers when slide changes start
  swiper.on('slideChangeTransitionStart', () => {
    // Apply the new state markers FIRST
    // This ensures the new active slide has data-state="active" before IX3 animations trigger
    applySlideStates(swiper);

    // Emit event - IX3 will query for [data-state="active"] based on Webflow Designer configuration
    emit(eventNames.start, {
      featureId: config.featureId,
      slideIndex: swiper.realIndex,
      type: 'carousel',
    });
  });

  // Emit event when slide change ends
  swiper.on('slideChangeTransitionEnd', () => {
    emit(eventNames.end, {
      featureId: config.featureId,
      slideIndex: swiper.realIndex,
      type: 'carousel',
    });
  });
}

/**
 * Dataset interface for parsing IX3 configuration
 * Subset of dataset attributes needed for IX3 integration
 */
interface IX3Dataset {
  sliderInstance?: string;
  featureId?: string;
  interactionEvents?: string;
  interactionPrefix?: string;
  interactionEventStart?: string;
  interactionEventEnd?: string;
}

/**
 * Parse IX3 configuration from element dataset
 *
 * Maps data attributes to IX3Config:
 * - data-slider-instance → featureId (primary, for backwards compatibility)
 * - data-feature-id → featureId (fallback, deprecated)
 * - data-interaction-events → enabled
 * - data-interaction-prefix → eventPrefix
 * - data-interaction-event-start → eventStart
 * - data-interaction-event-end → eventEnd
 *
 * @param dataset - Element dataset (or compatible object with IX3 attributes)
 * @returns IX3 configuration
 */
export function parseIX3Config(dataset: IX3Dataset): IX3Config {
  const config: IX3Config = {};

  // Use sliderInstance as the primary feature ID
  // Falls back to featureId for backwards compatibility
  if (dataset.sliderInstance) {
    config.featureId = dataset.sliderInstance;
  } else if (dataset.featureId) {
    config.featureId = dataset.featureId;
  }

  if (dataset.interactionEvents !== undefined) {
    config.enabled = dataset.interactionEvents === 'on' || dataset.interactionEvents === 'true';
  }

  if (dataset.interactionPrefix) {
    config.eventPrefix = dataset.interactionPrefix;
  }

  if (dataset.interactionEventStart) {
    config.eventStart = dataset.interactionEventStart;
  }

  if (dataset.interactionEventEnd) {
    config.eventEnd = dataset.interactionEventEnd;
  }

  return config;
}
