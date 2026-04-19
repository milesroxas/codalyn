import { toElementKey } from "@/entities/element/lib/id";
import type { ElementWithClassNames, WebflowElement } from "@/entities/element/model/element.types";
import type { RoleDetectionConfig, RolesByElement } from "@/features/linter/model/linter.types";
import type { DetectionContext, RoleDetector } from "@/features/linter/model/preset.types";

interface CreateArgs {
  detectors: RoleDetector[];
  config?: RoleDetectionConfig;
}

const DEFAULT_CONFIG: RoleDetectionConfig = { threshold: 0.6 };

function getParentId(el: WebflowElement | undefined): string | null {
  const pid = (el as any)?.parentId ?? (el as any)?.parent?.id ?? (el as any)?.parentNode?.id ?? null;
  return pid ? String(pid) : null;
}

function readStringAttributes(el: any): Record<string, string> {
  try {
    const attrs = el?.attributes;
    if (!attrs || typeof attrs !== "object") return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(attrs)) {
      if (typeof v === "string") out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function indexElementsForDetection(elements: ElementWithClassNames[]) {
  const parentIdByChildId = new Map<string, string | null>();
  const classesByElementId = new Map<string, string[]>();
  const elementById = new Map<string, WebflowElement | undefined>();

  for (const item of elements) {
    const element = item.element as WebflowElement | undefined;
    const elId = toElementKey(element);
    if (!elId) continue;

    const classNames = (item.classNames ?? []).filter(Boolean);
    classesByElementId.set(elId, classNames);

    parentIdByChildId.set(elId, getParentId(element));
    elementById.set(elId, element);
  }

  return { parentIdByChildId, classesByElementId, elementById };
}

function buildChildrenIdsByParent(parentIdByChildId: Map<string, string | null>): Map<string, string[]> {
  const childrenIdsByParentId = new Map<string, string[]>();
  for (const [childId, parentId] of parentIdByChildId.entries()) {
    if (!parentId) continue;
    const list = childrenIdsByParentId.get(parentId) ?? [];
    list.push(childId);
    childrenIdsByParentId.set(parentId, list);
  }
  return childrenIdsByParentId;
}

type RoleSnapshot = {
  readonly id: string;
  readonly tagName: string;
  readonly classes: readonly string[];
  readonly parentId: string | null;
  readonly childrenIds: readonly string[];
  readonly textContent?: string;
  readonly attributes: Readonly<Record<string, string>>;
};

function buildRoleSnapshots(
  elementById: Map<string, WebflowElement | undefined>,
  classesByElementId: Map<string, string[]>,
  parentIdByChildId: Map<string, string | null>,
  childrenIdsByParentId: Map<string, string[]>
): { snapshots: RoleSnapshot[]; snapshotById: Map<string, RoleSnapshot> } {
  const snapshots: RoleSnapshot[] = [];
  const snapshotById = new Map<string, RoleSnapshot>();

  for (const [id, _el] of elementById.entries()) {
    const el = _el as any;
    const classes = classesByElementId.get(id) ?? [];
    const parentId = parentIdByChildId.get(id) ?? null;
    const childrenIds = childrenIdsByParentId.get(id) ?? [];
    const tagName = (el?.tagName || "div") as string;
    const textContent = (el?.textContent ?? undefined) as string | undefined;
    const attributes = readStringAttributes(el);

    const snap: RoleSnapshot = {
      id,
      tagName,
      classes,
      parentId,
      childrenIds,
      textContent,
      attributes,
    };
    snapshots.push(snap);
    snapshotById.set(id, snap);
  }

  return { snapshots, snapshotById };
}

function structurePriority(aClasses: string[], bClasses: string[]): number {
  const getTypePriority = (classes: string[]) => {
    if (classes.some((c) => c === "page_main") || classes.some((c) => /^main/i.test(c))) return 1;
    if (classes.some((c) => c === "u-section") || classes.some((c) => /^section/i.test(c))) return 2;
    return 3;
  };
  return getTypePriority(aClasses) - getTypePriority(bClasses);
}

function bestRoleFromDetectors(
  elementId: string,
  detectors: RoleDetector[],
  snapshotById: Map<string, RoleSnapshot>,
  detectionContext: DetectionContext
): { bestRole: RolesByElement[string] | null; bestScore: number } {
  let bestRole: RolesByElement[string] | null = null;
  let bestScore = -1;

  for (const detector of detectors) {
    try {
      const elementSnapshot = snapshotById.get(elementId);
      if (!elementSnapshot) continue;

      const scored = detector.detect(elementSnapshot, detectionContext);

      if (!scored) continue;
      if (scored.score > bestScore) {
        bestScore = scored.score;
        bestRole = scored.role;
      }
    } catch (_error) {
      // detector errors are non-fatal; continue
    }
  }

  return { bestRole, bestScore };
}

function enforceSingletonMain(
  result: RolesByElement,
  scoresByElement: Record<string, { best: number; role: RolesByElement[string] }>
): void {
  const mainCandidates = Object.entries(scoresByElement)
    .filter(([, v]) => v.role === "main")
    .map(([elId, v]) => ({ elId, score: v.best }));

  if (mainCandidates.length <= 1) return;

  let winner = mainCandidates[0];
  for (const c of mainCandidates) {
    if (c.score > winner.score) winner = c;
  }
  for (const c of mainCandidates) {
    result[c.elId] = c.elId === winner.elId ? "main" : "unknown";
  }
}

export function createRoleDetectionService({ detectors, config }: CreateArgs) {
  const effectiveConfig: RoleDetectionConfig = {
    ...DEFAULT_CONFIG,
    ...(config ?? {}),
  };

  function detectRolesForPage(
    elements: ElementWithClassNames[],
    graph?: import("@/features/linter/model/linter.types").ElementGraphApi
  ): RolesByElement {
    const threshold = Math.max(0, Math.min(1, effectiveConfig.threshold));
    const result: RolesByElement = {};

    const { parentIdByChildId, classesByElementId, elementById } = indexElementsForDetection(elements);
    const childrenIdsByParentId = buildChildrenIdsByParent(parentIdByChildId);
    const { snapshots, snapshotById } = buildRoleSnapshots(
      elementById,
      classesByElementId,
      parentIdByChildId,
      childrenIdsByParentId
    );

    const scoresByElement: Record<string, { best: number; role: RolesByElement[string] }> = {};

    const detectionContext: DetectionContext = {
      allElements: snapshots,
      styleInfo: [],
      pageInfo: {},
      rolesByElement: result,
      graph,
    };

    const sortedElements = [...elements].sort((a, b) => structurePriority(a.classNames || [], b.classNames || []));

    for (const item of sortedElements) {
      const element = item.element as WebflowElement | undefined;
      const elementId = toElementKey(element);
      if (!elementId) {
        continue;
      }

      const { bestRole, bestScore } = bestRoleFromDetectors(elementId, detectors, snapshotById, detectionContext);

      result[elementId] = bestRole && bestScore >= threshold ? bestRole : "unknown";
      scoresByElement[elementId] = { best: bestScore, role: result[elementId] };
    }

    enforceSingletonMain(result, scoresByElement);

    return result;
  }

  return { detectRolesForPage } as const;
}
