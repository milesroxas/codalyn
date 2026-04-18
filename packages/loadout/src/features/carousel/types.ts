/**
 * Domain-specific types for carousel feature
 * Only types that are specific to our implementation, not re-exports from Swiper
 */

/**
 * Dataset attributes for carousel configuration
 * These are parsed from data-* attributes on the carousel element
 * Represents our domain model for how carousels are configured in HTML
 */
export interface CarouselDataset {
  /**
   * Instance identifier for the carousel (required)
   * Also used as the feature ID for IX3 event scoping and logging
   * Examples: 'hero', 'events', 'testimonials'
   */
  sliderInstance?: string;

  /** Visual effect for slide transitions */
  effect?: string;

  /** Enable cross-fade for fade effect (empty string or 'true' for true) */
  crossfade?: string;

  /** Number of slides to show at once, or 'auto' */
  slidesPerView?: string;

  /** Space between slides in pixels */
  spaceBetween?: string;

  /** Center the active slide (empty string or 'true' for true) */
  centeredSlides?: string;

  /** Enable loop mode (empty string or 'true' for true) */
  loop?: string;

  /** Selector or attribute for next navigation button */
  navNext?: string;

  /** Selector or attribute for previous navigation button */
  navPrev?: string;

  /** Selector or attribute for pagination container */
  pagination?: string;

  /** Responsive breakpoints configuration (JSON string) */
  breakpoints?: string;

  // IX3 Integration attributes
  /**
   * @deprecated Use sliderInstance instead
   * Feature ID for scoping IX3 interactions (e.g., 'hero', 'testimonials')
   */
  featureId?: string;

  /** Enable/disable IX3 interaction events ('on' or 'true' to enable) */
  interactionEvents?: string;

  /** Custom event prefix for IX3 events (default: 'interaction') */
  interactionPrefix?: string;

  /** Custom start event name (overrides prefix) */
  interactionEventStart?: string;

  /** Custom end event name (overrides prefix) */
  interactionEventEnd?: string;

  /** CSS selector for elements that should prevent swiping (e.g., '[data-no-swiping]') */
  noSwipingSelector?: string;
}

/**
 * Carousel instance interface
 * Represents our public API for an initialized carousel
 */
export interface CarouselInstance {
  element: HTMLElement;
  destroy: () => void;
}
