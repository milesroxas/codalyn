/**
 * Interaction Bridge - Webflow IX3 Integration
 *
 * A shared, reusable bridge for any feature to emit Webflow GSAP (IX3) custom events
 * and apply predictable DOM state markers.
 *
 * This is the single source of truth for IX3 integration across all features.
 * Features should use this bridge instead of directly accessing Webflow.require('ix3').
 *
 * @module interaction-bridge
 */

// Event emission
export { emit, emitPerSlide, isAvailable } from './emit';
export type { StateAssignment, StateConfig, StateValue } from './state';
// State management
export { clearState, getState, setState } from './state';
