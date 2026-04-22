export function findBank(root: ParentNode): Element | null {
  return root.querySelector("[data-beacon-bank]");
}

export function findBankComponent(bank: Element, componentId: string): Element | null {
  const safe = CSS.escape(componentId);
  return bank.querySelector(`[data-beacon-component="${safe}"]`);
}

export function cloneFromBank(bank: Element, componentId: string): Element | null {
  const source = findBankComponent(bank, componentId);
  if (!source) return null;
  const clone = source.cloneNode(true) as Element;
  clone.removeAttribute("data-beacon-component");
  return clone;
}
