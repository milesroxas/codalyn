import {
  CMS_SLOTS_ROUTE_TASK_ADDING_COMPONENT,
  CMS_SLOTS_ROUTE_TASK_CREATING_LIST,
  CMS_SLOTS_ROUTE_TASK_CREATING_LIST_TARGET,
  CMS_SLOTS_ROUTE_TASK_DELETING_LIST,
  CMS_SLOTS_ROUTE_TASK_FOCUSING_ON_CANVAS,
  CMS_SLOTS_ROUTE_TASK_LINKING_CMS_FIELD,
  CMS_SLOTS_ROUTE_TASK_PLACING_ON_CANVAS,
  CMS_SLOTS_ROUTE_TASK_REMOVING_COMPONENT,
  CMS_SLOTS_ROUTE_TASK_REMOVING_LIST_TARGET,
  CMS_SLOTS_ROUTE_TASK_SAVING_COMPOSITION,
  CMS_SLOTS_ROUTE_TASK_SAVING_EXPOSED_PROPS,
  CMS_SLOTS_ROUTE_TASK_SYNCING_PAGE_SCRIPT,
  CMS_SLOTS_ROUTE_TASK_TAGGING_DATA_ATTRIBUTES,
  CMS_SLOTS_SCAN_ARIA_LABEL,
  CMS_SLOTS_SCAN_MESSAGE,
} from "@/shared/lib/cms-slots-feature-copy";

export type CmsSlotsRouteTask = {
  message: string;
  ariaLabel: string;
};

export type CmsSlotsRouteTaskInput = {
  pageBootBlocking: boolean;
  routeTaskPhase: string | null;
  picking: boolean;
  addPending: boolean;
  resyncingEngineSlotKey: string | null;
  listTargetCreatePending: boolean;
  listTargetFocusOnCanvasPending: boolean;
  listTargetPlaceOnCanvasPending: boolean;
  listTargetRemovePending: boolean;
  slotPropsWritePending: boolean;
  embedSyncPending: boolean;
  composerSavePending: boolean;
  removingKey: string | null;
  deletePendingKey: string | null;
  createPending: boolean;
  cmsFieldLinkRetryPending: boolean;
};

function task(message: string, ariaLabel: string = message): CmsSlotsRouteTask {
  return { message, ariaLabel };
}

type RouteTaskRule = {
  match: (input: CmsSlotsRouteTaskInput) => CmsSlotsRouteTask | null;
};

const CMS_SLOTS_ROUTE_TASK_RULES: RouteTaskRule[] = [
  {
    match: (input) => (input.pageBootBlocking ? task(CMS_SLOTS_SCAN_MESSAGE, CMS_SLOTS_SCAN_ARIA_LABEL) : null),
  },
  {
    match: (input) => {
      const phase = input.routeTaskPhase?.trim();
      return phase ? task(phase) : null;
    },
  },
  {
    match: (input) =>
      input.resyncingEngineSlotKey != null ? task(CMS_SLOTS_ROUTE_TASK_TAGGING_DATA_ATTRIBUTES) : null,
  },
  {
    match: (input) => (input.addPending ? task(CMS_SLOTS_ROUTE_TASK_ADDING_COMPONENT) : null),
  },
  {
    match: (input) => (input.listTargetRemovePending ? task(CMS_SLOTS_ROUTE_TASK_REMOVING_LIST_TARGET) : null),
  },
  {
    match: (input) => (input.listTargetCreatePending ? task(CMS_SLOTS_ROUTE_TASK_CREATING_LIST_TARGET) : null),
  },
  {
    match: (input) => (input.listTargetFocusOnCanvasPending ? task(CMS_SLOTS_ROUTE_TASK_FOCUSING_ON_CANVAS) : null),
  },
  {
    match: (input) => (input.listTargetPlaceOnCanvasPending ? task(CMS_SLOTS_ROUTE_TASK_PLACING_ON_CANVAS) : null),
  },
  {
    match: (input) => (input.slotPropsWritePending ? task(CMS_SLOTS_ROUTE_TASK_SAVING_EXPOSED_PROPS) : null),
  },
  {
    match: (input) => (input.embedSyncPending ? task(CMS_SLOTS_ROUTE_TASK_SYNCING_PAGE_SCRIPT) : null),
  },
  {
    match: (input) => (input.composerSavePending ? task(CMS_SLOTS_ROUTE_TASK_SAVING_COMPOSITION) : null),
  },
  {
    match: (input) => (input.removingKey != null ? task(CMS_SLOTS_ROUTE_TASK_REMOVING_COMPONENT) : null),
  },
  {
    match: (input) => (input.deletePendingKey != null ? task(CMS_SLOTS_ROUTE_TASK_DELETING_LIST) : null),
  },
  {
    match: (input) => (input.createPending ? task(CMS_SLOTS_ROUTE_TASK_CREATING_LIST) : null),
  },
  {
    match: (input) => (input.cmsFieldLinkRetryPending ? task(CMS_SLOTS_ROUTE_TASK_LINKING_CMS_FIELD) : null),
  },
];

/** Resolves the highest-priority blocking CMS Slots task for the route overlay. */
export function resolveCmsSlotsRouteTask(input: CmsSlotsRouteTaskInput): CmsSlotsRouteTask | null {
  for (const rule of CMS_SLOTS_ROUTE_TASK_RULES) {
    const resolved = rule.match(input);
    if (resolved != null) {
      return resolved;
    }
  }
  return null;
}
