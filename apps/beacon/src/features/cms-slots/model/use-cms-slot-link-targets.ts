/**
 * React hooks that lazily load link-picker targets (pages, CMS collections, CMS entries) on first open and cache the
 * result for the lifetime of the field. Follows the Beacon convention of `useEffect` + `useState` + `towerFetch`
 * (no react-query). All Webflow boundary normalization happens in the loaders these hooks call.
 */

import { useCallback, useEffect, useState } from "react";
import type {
  LinkPickerCollection,
  LinkPickerEntry,
  LinkPickerPage,
} from "@/features/cms-slots/model/cms-slot-link-targets";
import {
  loadCurrentPageId,
  loadLinkPickerCollections,
  loadLinkPickerEntries,
  loadLinkPickerPages,
} from "@/features/cms-slots/model/cms-slot-link-targets-data";
import { getCmsTemplateCollectionIdFromCurrentPage } from "@/features/cms-slots/model/cms-slot-list-target-cms-text-binding";

export type AsyncList<T> = { items: readonly T[]; loading: boolean; error: string | null };

const IDLE: AsyncList<never> = { items: [], loading: false, error: null };

function errorMessage(e: unknown): string {
  return e instanceof Error && e.message ? e.message : "Couldn’t load options. Try again.";
}

/** Runs `loader` once `enabled` is true (and whenever the loader identity changes); cancels on unmount. */
function useAsyncList<T>(enabled: boolean, loader: () => Promise<T[]>): AsyncList<T> {
  const [state, setState] = useState<AsyncList<T>>(IDLE);
  useEffect(() => {
    if (!enabled) {
      return;
    }
    let cancelled = false;
    setState((prev) => ({ items: prev.items, loading: true, error: null }));
    loader()
      .then((items) => {
        if (!cancelled) {
          setState({ items, loading: false, error: null });
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setState({ items: [], loading: false, error: errorMessage(e) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, loader]);
  return state;
}

export function useLinkPickerPages(enabled: boolean): AsyncList<LinkPickerPage> {
  return useAsyncList(enabled, loadLinkPickerPages);
}

export function useLinkPickerCollections(enabled: boolean): AsyncList<LinkPickerCollection> {
  return useAsyncList(enabled, loadLinkPickerCollections);
}

export function useLinkPickerEntries(collection: LinkPickerCollection | null): AsyncList<LinkPickerEntry> {
  const loader = useCallback(() => {
    if (collection == null) {
      return Promise.resolve<LinkPickerEntry[]>([]);
    }
    return loadLinkPickerEntries(collection.id, collection.templatePath);
  }, [collection]);
  return useAsyncList(collection != null, loader);
}

/**
 * Id of the page the designer is currently on, loaded once `enabled`. The page picker disables this option so a page
 * cannot link to itself.
 */
export function useCurrentPageId(enabled: boolean): string | null {
  const [pageId, setPageId] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) {
      return;
    }
    let cancelled = false;
    loadCurrentPageId()
      .then((id) => {
        if (!cancelled) {
          setPageId(id);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPageId(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  return pageId;
}

/**
 * The collection id of the current page when it is a CMS template page, else null. Loaded once `enabled`, so the CMS
 * tab can preselect the collection the designer is already working in (lowest-friction default).
 */
export function useCurrentTemplateCollectionId(enabled: boolean): string | null {
  const [collectionId, setCollectionId] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) {
      return;
    }
    let cancelled = false;
    getCmsTemplateCollectionIdFromCurrentPage()
      .then((id) => {
        if (!cancelled) {
          setCollectionId(id);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCollectionId(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  return collectionId;
}
