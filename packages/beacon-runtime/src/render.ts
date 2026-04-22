import { applyOverrides } from "./apply-overrides";
import { cloneFromBank, findBank } from "./clone-from-bank";
import { parseComposition } from "./parse-composition";
import type { RenderContext } from "./types";

const SLOT_SELECTOR = "[data-beacon-slot][data-composition]";
const RENDERED_FLAG = "data-beacon-rendered";

function getSlotComposition(slot: Element): string | null {
  return slot.getAttribute("data-composition");
}

function getSlotName(slot: Element): string {
  return slot.getAttribute("data-beacon-slot") || "default";
}

function renderSlot(slot: Element, bank: Element, warn: (m: string) => void): void {
  if (slot.hasAttribute(RENDERED_FLAG)) return;
  const raw = getSlotComposition(slot);
  const composition = parseComposition(raw);
  const slotName = getSlotName(slot);
  const blocks = composition.slots[slotName] ?? [];

  slot.textContent = "";
  for (const block of blocks) {
    const node = cloneFromBank(bank, block.componentId);
    if (!node) {
      warn(`beacon-runtime: component "${block.componentId}" not found in bank (slot "${slotName}")`);
      continue;
    }
    applyOverrides(node, block.overrides);
    slot.appendChild(node);
  }
  slot.setAttribute(RENDERED_FLAG, "true");
}

export function render(context: RenderContext): void {
  const root = context.root;
  const warn = context.warn ?? ((m) => console.warn(m));
  const bank = findBank(root);
  if (!bank) {
    warn("beacon-runtime: no [data-beacon-bank] element on page");
    return;
  }
  const slots = root.querySelectorAll(SLOT_SELECTOR);
  for (const slot of Array.from(slots)) {
    try {
      renderSlot(slot, bank, warn);
    } catch (err) {
      warn(`beacon-runtime: slot render failed (${(err as Error).message ?? String(err)})`);
    }
  }
  if (bank instanceof HTMLElement) {
    bank.style.display = "none";
    bank.setAttribute("aria-hidden", "true");
  }
}
