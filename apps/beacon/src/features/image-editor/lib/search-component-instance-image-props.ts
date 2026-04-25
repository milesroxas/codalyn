import { asCmsBinding } from "@/features/image-editor/lib/element-cms-image-binding";

export type ComponentInstanceImageProp = InstanceProp & { isCmsBinding: boolean };

/**
 * Image-related component props: `imageAsset` / `image` in definitions; CMS-bound
 * fields may appear as `cmsImage`, `image`, or `imageSet` in
 * {@link ComponentElement.searchProps}. Query all and dedupe by `propId`.
 *
 * @see https://developers.webflow.com/designer/reference/introduction (Designer)
 * @see BindableValueType in `@webflow/designer-extension-typings`
 */
export async function searchComponentInstanceImageProps(
  instance: ComponentElement
): Promise<ComponentInstanceImageProp[]> {
  const [imageAsset, cmsImage, image, imageSet] = await Promise.all([
    instance.searchProps({ valueType: "imageAsset" }),
    instance.searchProps({ valueType: "cmsImage" }),
    instance.searchProps({ valueType: "image" }),
    instance.searchProps({ valueType: "imageSet" }),
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
  for (const p of image) {
    upsert(p);
  }
  for (const p of imageSet) {
    upsert(p);
  }
  return [...byPropId.values()];
}
