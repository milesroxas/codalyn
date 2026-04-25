import { WEBFLOW_IMAGE_ELEMENT_TYPE } from "@/features/image-editor/lib/apply-cropped-export";
import { searchComponentInstanceImageProps } from "@/features/image-editor/lib/search-component-instance-image-props";

export type ImagePageTarget = {
  id: string;
  kind: "image" | "component";
  element: AnyElement;
  label: string;
  /** When kind is "component" — the prop Beacon will set on export. */
  imagePropId?: string;
  imagePropLabel?: string;
};

const MAX_TARGETS = 200;

function shortId(n: number, prefix: string): string {
  return `${prefix}-${n}`;
}

async function makeImageLabel(_el: ImageElement): Promise<string> {
  return "Image";
}

function imagePropLabelFrom(p: InstanceProp): string {
  const l = p.display?.label;
  return l && l.length > 0 ? l : "Image field";
}

async function tryPushScannedImageTarget(el: AnyElement, out: ImagePageTarget[]): Promise<void> {
  if (el.type === WEBFLOW_IMAGE_ELEMENT_TYPE) {
    const label = await makeImageLabel(el as ImageElement);
    out.push({
      id: shortId(out.length, "image"),
      kind: "image",
      element: el,
      label,
    });
    return;
  }
  if (el.type === "ComponentInstance") {
    const inst = el as ComponentElement;
    const props = await searchComponentInstanceImageProps(inst);
    if (props.length === 0) {
      return;
    }
    const comp = await inst.getComponent();
    const cname = (await comp.getName()) || "Component";
    const p0 = props[0];
    if (!p0) {
      return;
    }
    out.push({
      id: shortId(out.length, "comp"),
      kind: "component",
      element: el,
      label: cname,
      imagePropId: p0.propId,
      imagePropLabel: imagePropLabelFrom(p0),
    });
  }
}

/**
 * Lists Image elements and component instances with at least one image-capable prop
 * (`imageAsset`, `cmsImage`, `image`, `imageSet`) on the current page.
 *
 * Uses {@link webflow.getAllElements} so instances are not missed when a tree
 * walk from `Body` omits nodes (e.g. slots or nested structures).
 */
export async function scanImageTargetsOnPage(): Promise<ImagePageTarget[]> {
  const all = await webflow.getAllElements();
  const out: ImagePageTarget[] = [];

  for (const el of all) {
    if (out.length >= MAX_TARGETS) {
      break;
    }
    await tryPushScannedImageTarget(el, out);
  }

  return out;
}

export type SelectedImageTargetHint =
  | { kind: "none" }
  | { kind: "image"; target: ImagePageTarget }
  | { kind: "component"; target: ImagePageTarget; propCount: number };

/**
 * If the current canvas selection is an image-capable target, returns a hint
 * (best-effort: compare element references by identity after rescan, or
 * for robustness, match type + re-scan; here we only check selected element
 * in isolation to avoid a full rescan on every call).
 */
function hintForListMatch(t: ImagePageTarget): SelectedImageTargetHint {
  if (t.kind === "image") {
    return { kind: "image", target: t };
  }
  return {
    kind: "component",
    target: t,
    propCount: 1,
  };
}

async function hintForSelectedOutsideList(sel: AnyElement): Promise<SelectedImageTargetHint> {
  if (sel.type === WEBFLOW_IMAGE_ELEMENT_TYPE) {
    const label = await makeImageLabel(sel as ImageElement);
    return {
      kind: "image",
      target: {
        id: "selected-image",
        kind: "image",
        element: sel,
        label,
      },
    };
  }
  if (sel.type !== "ComponentInstance") {
    return { kind: "none" };
  }
  const inst = sel as ComponentElement;
  const props = await searchComponentInstanceImageProps(inst);
  if (props.length === 0) {
    return { kind: "none" };
  }
  const comp = await inst.getComponent();
  const cname = (await comp.getName()) || "Component";
  const p0 = props[0];
  if (!p0) {
    return { kind: "none" };
  }
  return {
    kind: "component",
    target: {
      id: "selected-comp",
      kind: "component",
      element: sel,
      label: cname,
      imagePropId: p0.propId,
      imagePropLabel: imagePropLabelFrom(p0),
    },
    propCount: props.length,
  };
}

export async function getSelectedImageTargetHint(allTargets: ImagePageTarget[]): Promise<SelectedImageTargetHint> {
  const sel = await webflow.getSelectedElement();
  if (sel == null) {
    return { kind: "none" };
  }
  for (const t of allTargets) {
    if (t.element === sel) {
      return hintForListMatch(t);
    }
  }
  return await hintForSelectedOutsideList(sel);
}
