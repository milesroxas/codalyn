function readComponentDefinitionIdFromInstance(instance: ComponentElement): string | null {
  const componentId = (instance.id as { component?: unknown }).component;
  return typeof componentId === "string" && componentId.length > 0 ? componentId : null;
}

function readComponentDefinitionId(component: Component): string | null {
  const id = (component as { id?: unknown }).id;
  if (typeof id === "string" && id.length > 0) {
    return id;
  }
  if (id && typeof id === "object") {
    const componentId = (id as { component?: unknown }).component;
    if (typeof componentId === "string" && componentId.length > 0) {
      return componentId;
    }
  }
  return null;
}

export async function readComponentDefinitionIdForInstance(instance: ComponentElement): Promise<string | null> {
  const component = await instance.getComponent().catch(() => null);
  return (component ? readComponentDefinitionId(component) : null) ?? readComponentDefinitionIdFromInstance(instance);
}
