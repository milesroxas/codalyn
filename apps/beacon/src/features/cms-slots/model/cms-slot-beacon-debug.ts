/**
 * Stand-in for the development-only debug HUD (`cms-slot-beacon-debug-hud.ts`): declares the four functions the footer runtime calls
 * (`bLog`, `bDbgBump`, `bDbgBindKeys`, `bDbgRuntimeInfo`) as no-ops so the runtime parses and runs without shipping the
 * styled HUD, its CSS, or the event-log buffer to live traffic. Every non-`development` channel (production AND
 * preview) embeds this stub — only development builds ship the full HUD (Marketplace: no app keyboard shortcuts,
 * reviewed runtime = shipped runtime; pinned by cms-slot-beacon-prop-runtime.test.ts). The HUD lives in its own
 * module so release builds never import it and the private review source maps never carry it.
 */
export function beaconPropDebugStubSource(): string {
  return `function bLog() {}
function bDbgBump() {}
function bDbgBindKeys() {}
function bDbgRuntimeInfo() {}
`;
}
