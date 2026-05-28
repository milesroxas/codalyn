import { createContext, type ReactNode, useContext } from "react";
import { cmsSlotsDrawerDismissBlocked } from "@/features/cms-slots/model/cms-slots-route-interaction";

const CmsSlotsRouteInteractionBlockedContext = createContext(false);

export function CmsSlotsRouteInteractionProvider(props: { blocked: boolean; children: ReactNode }) {
  return (
    <CmsSlotsRouteInteractionBlockedContext.Provider value={props.blocked}>
      {props.children}
    </CmsSlotsRouteInteractionBlockedContext.Provider>
  );
}

export function useCmsSlotsRouteInteractionBlocked(): boolean {
  return useContext(CmsSlotsRouteInteractionBlockedContext);
}

export function useCmsSlotsDrawerDismissBlocked(...localBusy: boolean[]): boolean {
  return cmsSlotsDrawerDismissBlocked(...localBusy);
}
