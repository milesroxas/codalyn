import { render } from "./render";

export { applyOverrides } from "./apply-overrides";
export { cloneFromBank, findBank, findBankComponent } from "./clone-from-bank";
export { parseComposition } from "./parse-composition";
export { render } from "./render";
export type {
  BeaconBlock,
  BeaconBlockOverrides,
  BeaconComposition,
  BeaconFieldType,
  RenderContext,
} from "./types";

function bootstrap(): void {
  if (typeof document === "undefined") return;
  render({ root: document });
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
  } else {
    bootstrap();
  }
}
