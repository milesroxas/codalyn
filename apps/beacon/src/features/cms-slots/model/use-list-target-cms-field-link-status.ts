import { type MutableRefObject, useCallback, useEffect, useRef, useState } from "react";
import type { CmsSlotListCmsBinding } from "@/features/cms-slots/model/cms-slot-list-target-cms-text-binding";
import type { CmsSlotListTargetPhase } from "@/features/cms-slots/model/cms-slot-list-target-phase";
import { detectCmsSlotListTargetCmsFieldLink } from "@/features/cms-slots/model/detect-cms-slot-list-target-cms-field-link";

type UseListTargetCmsFieldLinkStatusParams = {
  picking: boolean;
  listTargetPhase: CmsSlotListTargetPhase;
  listTargetOnCanvasCount: number;
  listTargetOnCanvasCountResolved: boolean;
  activeDataList: string | null;
  activeBeaconKey: string | null;
  targetRef: MutableRefObject<BlockElement | null>;
  listTargetDefinitionIdRef: MutableRefObject<string | null>;
  onUnlinkedBinding: (binding: CmsSlotListCmsBinding) => void;
};

async function resolveListTargetCmsFieldLinkUnlinked(
  dataList: string,
  listContainer: BlockElement,
  preferredDefinitionId: string | null,
  onUnlinkedBinding: (binding: CmsSlotListCmsBinding) => void
): Promise<boolean> {
  const result = await detectCmsSlotListTargetCmsFieldLink({
    dataList,
    listContainer,
    preferredDefinitionId,
  });
  if (result.status === "unlinked") {
    onUnlinkedBinding(result.binding);
    return true;
  }
  return false;
}

export function useListTargetCmsFieldLinkStatus(params: UseListTargetCmsFieldLinkStatusParams): {
  listTargetCmsFieldUnlinked: boolean;
  listTargetCmsFieldLinkCheckPending: boolean;
  refreshListTargetCmsFieldLinkStatus: () => void;
} {
  const {
    picking,
    listTargetPhase,
    listTargetOnCanvasCount,
    listTargetOnCanvasCountResolved,
    activeDataList,
    activeBeaconKey,
    targetRef,
    listTargetDefinitionIdRef,
    onUnlinkedBinding,
  } = params;

  const [listTargetCmsFieldUnlinked, setListTargetCmsFieldUnlinked] = useState(false);
  const [listTargetCmsFieldLinkCheckPending, setListTargetCmsFieldLinkCheckPending] = useState(false);
  const checkGenRef = useRef(0);
  const onUnlinkedBindingRef = useRef(onUnlinkedBinding);
  onUnlinkedBindingRef.current = onUnlinkedBinding;

  const shouldCheck =
    picking &&
    listTargetPhase === "synced" &&
    listTargetOnCanvasCountResolved &&
    listTargetOnCanvasCount > 0 &&
    activeDataList != null &&
    activeBeaconKey != null &&
    targetRef.current != null;

  const runCheck = useCallback(() => {
    if (!shouldCheck) {
      setListTargetCmsFieldUnlinked(false);
      setListTargetCmsFieldLinkCheckPending(false);
      return;
    }

    const listContainer = targetRef.current;
    const dataList = activeDataList;
    if (listContainer == null || dataList == null) {
      setListTargetCmsFieldUnlinked(false);
      setListTargetCmsFieldLinkCheckPending(false);
      return;
    }

    const myGen = ++checkGenRef.current;
    setListTargetCmsFieldLinkCheckPending(true);
    void (async () => {
      try {
        const unlinked = await resolveListTargetCmsFieldLinkUnlinked(
          dataList,
          listContainer,
          listTargetDefinitionIdRef.current,
          onUnlinkedBindingRef.current
        );
        if (myGen !== checkGenRef.current) {
          return;
        }
        setListTargetCmsFieldUnlinked(unlinked);
      } catch {
        if (myGen === checkGenRef.current) {
          setListTargetCmsFieldUnlinked(false);
        }
      } finally {
        if (myGen === checkGenRef.current) {
          setListTargetCmsFieldLinkCheckPending(false);
        }
      }
    })();
  }, [shouldCheck, activeDataList, targetRef, listTargetDefinitionIdRef]);

  useEffect(() => {
    runCheck();
  }, [runCheck]);

  return {
    listTargetCmsFieldUnlinked,
    listTargetCmsFieldLinkCheckPending,
    refreshListTargetCmsFieldLinkStatus: runCheck,
  };
}
