/**
 * All site components, optionally filtered the same way as the Components panel (when available).
 */
export async function listSiteComponentsForPicker(query: string): Promise<ComponentSearchResult[]> {
  if (typeof webflow.searchComponents === "function") {
    return webflow.searchComponents({ q: query });
  }
  const components = await webflow.getAllComponents();
  const rows = await Promise.all(
    components.map(async (c) => {
      const name = await c.getName();
      const settings = await c.getSettings();
      const instances = await c.getInstanceCount();
      return {
        id: c.id,
        name,
        group: settings.group,
        description: settings.description,
        instances,
        canEdit: true,
        library: null,
      } satisfies ComponentSearchResult;
    })
  );
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) => r.name.toLowerCase().includes(q) || r.group.toLowerCase().includes(q));
}

/**
 * Places a new instance of the given component as the last child of the target container.
 */
export async function appendComponentToBeacon(container: BlockElement, componentId: string): Promise<ComponentElement> {
  const component = await webflow.getComponent(componentId);
  return (await container.append(component)) as ComponentElement;
}

export async function removeComponentInstanceFromCanvas(instance: ComponentElement): Promise<void> {
  await instance.remove();
}

/**
 * Removes the beacon target **Block** (and any child component instances) from the page.
 */
export async function removeBeaconTargetFromPage(container: BlockElement): Promise<void> {
  await container.remove();
}
