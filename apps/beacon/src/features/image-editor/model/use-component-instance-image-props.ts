import { useCallback, useEffect, useRef, useState } from "react";

import type { ComponentImagePropOption } from "@/features/image-editor/lib/component-image-prop";

export function useComponentInstanceImageProps() {
  const [componentImageProps, setComponentImageProps] = useState<ComponentImagePropOption[]>([]);
  const [selectedComponentImagePropId, setSelectedComponentImagePropId] = useState<string | null>(null);
  const [selectedElementType, setSelectedElementType] = useState<string | null>(null);
  const [componentImagePropsResolving, setComponentImagePropsResolving] = useState(false);
  const componentPropsResolveGenRef = useRef(0);

  const refreshComponentImageProps = useCallback(async (el: AnyElement | null) => {
    const gen = ++componentPropsResolveGenRef.current;
    setSelectedElementType(el?.type ?? null);

    if (el?.type !== "ComponentInstance") {
      setComponentImagePropsResolving(false);
      setComponentImageProps([]);
      setSelectedComponentImagePropId(null);
      return;
    }

    setComponentImagePropsResolving(true);
    try {
      const instance = el as ComponentElement;
      const props = await instance.searchProps({ valueType: "imageAsset" });
      if (gen !== componentPropsResolveGenRef.current) {
        return;
      }
      const opts: ComponentImagePropOption[] = props.map((p) => ({
        propId: p.propId,
        label: p.display.label,
      }));
      setComponentImageProps(opts);
      setSelectedComponentImagePropId((prev) => {
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
      if (gen !== componentPropsResolveGenRef.current) {
        return;
      }
      setComponentImageProps([]);
      setSelectedComponentImagePropId(null);
    } finally {
      if (gen === componentPropsResolveGenRef.current) {
        setComponentImagePropsResolving(false);
      }
    }
  }, []);

  useEffect(() => {
    void webflow.getSelectedElement().then((el) => void refreshComponentImageProps(el));
    const unsub = webflow.subscribe("selectedelement", (el) => {
      void refreshComponentImageProps(el);
    });
    return unsub;
  }, [refreshComponentImageProps]);

  return {
    componentImageProps,
    selectedComponentImagePropId,
    setSelectedComponentImagePropId,
    selectedElementType,
    componentImagePropsResolving,
  };
}
