import type { MutableRefObject, SetStateAction } from "react";
import type { ElementCmsBindingResolution } from "@/features/image-editor/lib/cms-primary-upload-context";
import type { ComponentImagePropOption } from "@/features/image-editor/lib/component-image-prop";
import { resolveSingleElementCmsImageBinding } from "@/features/image-editor/lib/element-cms-image-binding";
import { searchComponentInstanceImageProps } from "@/features/image-editor/lib/search-component-instance-image-props";

type GenRef = MutableRefObject<number>;

function stale(gen: number, genRef: GenRef): boolean {
  return gen !== genRef.current;
}

function resolutionFromBinding(
  r: Awaited<ReturnType<typeof resolveSingleElementCmsImageBinding>>
): ElementCmsBindingResolution {
  if (r === null) {
    return "none";
  }
  if (r === "multiple") {
    return "multiple";
  }
  return "single";
}

export async function refreshNonComponentInstanceSelection(
  el: AnyElement | null,
  gen: number,
  genRef: GenRef,
  set: {
    setComponentImagePropsResolving: (v: boolean) => void;
    setComponentImageProps: (v: ComponentImagePropOption[]) => void;
    setSelectedComponentImagePropId: (v: SetStateAction<string | null>) => void;
    setElementCmsBinding: (v: ElementCmsBindingResolution) => void;
    setElementCmsBindingLoading: (v: boolean) => void;
  }
): Promise<void> {
  set.setComponentImagePropsResolving(false);
  set.setComponentImageProps([]);
  set.setSelectedComponentImagePropId(null);

  if (el && "elementSettings" in el && el.elementSettings === true) {
    set.setElementCmsBindingLoading(true);
    try {
      const r = await resolveSingleElementCmsImageBinding(el);
      if (stale(gen, genRef)) {
        return;
      }
      set.setElementCmsBinding(resolutionFromBinding(r));
    } catch {
      if (stale(gen, genRef)) {
        return;
      }
      set.setElementCmsBinding("none");
    } finally {
      if (!stale(gen, genRef)) {
        set.setElementCmsBindingLoading(false);
      }
    }
    return;
  }

  set.setElementCmsBinding("none");
  set.setElementCmsBindingLoading(false);
}

export async function refreshComponentInstanceSelection(
  el: ComponentElement,
  gen: number,
  genRef: GenRef,
  set: {
    setComponentImagePropsResolving: (v: boolean) => void;
    setComponentImageProps: (v: ComponentImagePropOption[]) => void;
    setSelectedComponentImagePropId: (v: SetStateAction<string | null>) => void;
  }
): Promise<void> {
  set.setComponentImagePropsResolving(true);
  try {
    const props = await searchComponentInstanceImageProps(el);
    if (stale(gen, genRef)) {
      return;
    }
    const opts: ComponentImagePropOption[] = props.map((p) => ({
      propId: p.propId,
      label: p.display.label,
      isCmsBinding: p.isCmsBinding,
    }));
    set.setComponentImageProps(opts);
    set.setSelectedComponentImagePropId((prev) => {
      if (opts.length === 0) {
        return null;
      }
      if (opts.length === 1) {
        return opts[0].propId;
      }
      if (prev && opts.some((o) => o.propId === prev)) {
        return prev;
      }
      return opts[0].propId;
    });
  } catch {
    if (stale(gen, genRef)) {
      return;
    }
    set.setComponentImageProps([]);
    set.setSelectedComponentImagePropId(null);
  } finally {
    if (!stale(gen, genRef)) {
      set.setComponentImagePropsResolving(false);
    }
  }
}
