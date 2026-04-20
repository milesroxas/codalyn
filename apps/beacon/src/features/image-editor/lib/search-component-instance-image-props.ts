import { asCmsBinding } from "@/features/image-editor/lib/element-cms-image-binding";

export type ComponentInstanceImageProp = InstanceProp & { isCmsBinding: boolean };

/**
 * Image-related component props use `imageAsset` in definitions, but when a CMS
 * image field is bound Webflow may surface the prop as `cmsImage` in
 * {@link ComponentElement.searchProps}. Query both and dedupe by `propId`.
 *
 * @see https://developers.webflow.com/designer/reference/introduction (Designer)
 * @see BindableValueType in `@webflow/designer-extension-typings`
 */
export async function searchComponentInstanceImageProps(
  instance: ComponentElement
): Promise<ComponentInstanceImageProp[]> {
  const [imageAsset, cmsImage] = await Promise.all([
    instance.searchProps({ valueType: "imageAsset" }),
    instance.searchProps({ valueType: "cmsImage" }),
  ]);
  const byPropId = new Map<string, ComponentInstanceImageProp>();
  const upsert = (p: InstanceProp) => {
    const cms = asCmsBinding(p.value) !== null;
    const prev = byPropId.get(p.propId);
    if (!prev) {
      byPropId.set(p.propId, { ...p, isCmsBinding: cms });
      return;
    }
    byPropId.set(p.propId, { ...p, isCmsBinding: prev.isCmsBinding || cms });
  };
  for (const p of imageAsset) {
    upsert(p);
  }
  for (const p of cmsImage) {
    upsert(p);
  }
  return [...byPropId.values()];
}
