/**
 * Copy a component instance prop id to the clipboard and notify in Designer (best effort).
 */
export async function copyBeaconInstancePropId(propId: string): Promise<void> {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.clipboard?.writeText === "function") {
      await navigator.clipboard.writeText(propId);
    }
    if (typeof webflow !== "undefined" && typeof webflow.notify === "function") {
      void webflow.notify({ type: "Success", message: "Prop id copied to clipboard." });
    }
  } catch {
    if (typeof webflow !== "undefined" && typeof webflow.notify === "function") {
      void webflow.notify({ type: "Error", message: "Could not copy — select and copy the id text manually." });
    }
  }
}
