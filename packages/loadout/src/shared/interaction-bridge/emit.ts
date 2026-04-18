/**
 * Interaction Bridge - Webflow IX3 Event Emitter
 *
 * Provides a safe interface to emit custom events to Webflow's GSAP IX3 system.
 * This is the single source of truth for IX3 integration across all features.
 */

/**
 * IX3 API interface from Webflow
 */
interface IX3API {
  emit: (eventName: string, payload?: unknown) => void;
  destroy: () => void;
  ready: () => Promise<void>;
}

/**
 * Global Webflow interface
 */
interface WebflowGlobal {
  require: (module: string) => IX3API | undefined;
}

declare const Webflow: WebflowGlobal | undefined;

/**
 * Resolve IX3 API from Webflow
 * Returns null if IX3 is unavailable
 *
 * Note: We resolve fresh on each call to ensure we always have the current IX3 instance.
 * This follows Webflow's recommended pattern: Webflow.require('ix3').emit(...)
 */
function resolveIX3(): IX3API | null {
  // Check if running in Webflow environment
  if (typeof Webflow === 'undefined' || typeof Webflow.require !== 'function') {
    return null;
  }

  try {
    const ix3 = Webflow.require('ix3');
    return ix3 || null;
  } catch {
    return null;
  }
}

/**
 * Check if IX3 is available in the current environment
 *
 * @returns true if Webflow IX3 is available
 */
export function isAvailable(): boolean {
  return resolveIX3() !== null;
}

/**
 * Emit a custom event to Webflow IX3
 *
 * Safe to call in any environment - no-ops when IX3 is unavailable.
 * Events are prefixed with 'interaction:' by default for consistency.
 *
 * @param eventName - Event name (will be prefixed if not already)
 * @param payload - Optional event payload
 *
 * @example
 * ```ts
 * // Emit a canonical event
 * emit('state-change:start');
 *
 * // Emit a feature-namespaced event
 * emit('carousel:state-change:start', { slideIndex: 0 });
 * ```
 */
export function emit(eventName: string, payload?: unknown): void {
  const ix3 = resolveIX3();

  if (!ix3) {
    return;
  }

  try {
    // Normalize event name - add interaction: prefix if not present
    const normalizedName = eventName.startsWith('interaction:')
      ? eventName
      : `interaction:${eventName}`;

    // Emit the event - IX3 will handle animation based on Webflow Designer configuration
    ix3.emit(normalizedName, payload);
  } catch {
    // Silently fail - IX3 errors shouldn't break the carousel
  }
}

/**
 * Emit a per-slide interaction event with unique event names
 *
 * This helper generates unique event names for each slide, allowing you to create
 * specific Webflow interactions for individual slides.
 *
 * @param slideIndex - Current slide index (0-based)
 * @param totalSlides - Total number of slides
 * @param options - Configuration options
 *
 * @example
 * ```ts
 * // Emit event for slide 2 out of 5 slides
 * emitPerSlide(1, 5, {
 *   eventPattern: 'state-change:start-slide-{index}',
 *   featureId: 'hero'
 * });
 * // Emits: "interaction:state-change:start-slide-1"
 *
 * // With 1-based indexing
 * emitPerSlide(0, 5, {
 *   eventPattern: 'slide-{index}',
 *   oneBasedIndex: true
 * });
 * // Emits: "interaction:slide-1"
 * ```
 */
export function emitPerSlide(
  slideIndex: number,
  totalSlides: number,
  options: {
    /** Event name pattern with {index} placeholder (e.g., 'state-change:start-slide-{index}') */
    eventPattern: string;
    /** Use 1-based index instead of 0-based (default: false) */
    oneBasedIndex?: boolean;
    /** Optional feature ID to include in payload */
    featureId?: string;
  }
): void {
  const ix3 = resolveIX3();

  if (!ix3) {
    return;
  }

  try {
    // Calculate the index to use in the event name
    const displayIndex = options.oneBasedIndex ? slideIndex + 1 : slideIndex;

    // Replace {index} placeholder with actual index
    const eventName = options.eventPattern.replace('{index}', displayIndex.toString());

    // Normalize event name - add interaction: prefix if not present
    const normalizedName = eventName.startsWith('interaction:')
      ? eventName
      : `interaction:${eventName}`;

    const payload = {
      slideIndex,
      totalSlides,
      ...(options.featureId && { featureId: options.featureId }),
    };

    // Emit the event
    ix3.emit(normalizedName, payload);
  } catch {
    // Silently fail - IX3 errors shouldn't break the carousel
  }
}
