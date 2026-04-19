// Rehomed from features/linter/services/style-service.ts (no logic changes)

import { toElementKey } from "@/entities/element/lib/id";

import type { StyleInfo, StyleWithElement } from "../model/style.types";
import { getStyleServiceCache, setStyleServiceCache } from "./style-service-cache";

interface Style {
  id: string;
  getName: () => Promise<string>;
  getProperties: (options?: { breakpoint: string }) => Promise<any>;
  // Webflow Designer API: style.isComboClass(): Promise<boolean>
  // Optional at type level to allow graceful fallback in non-supporting contexts
  isComboClass?: () => Promise<boolean>;
}

export interface ElementStyleInfo {
  elementId: string;
  styles: StyleInfo[];
}

const DEBUG = false;

const COMBO_NAME_HEURISTIC = /^(?:is[-_][A-Za-z0-9_]+|is[A-Z][A-Za-z0-9_]*)$/;

async function appendUniqueAppliedStyleIfNew(
  style: Style,
  index: number,
  seenIds: Set<string>,
  uniqueStyles: StyleInfo[],
  debug: boolean
): Promise<void> {
  const id = style.id;
  const name = await style.getName();
  const trimmedName = name?.trim() || "";
  const { isCombo, detectionSource } = await detectComboFromStyle(style, trimmedName);

  if (!id || seenIds.has(id)) {
    return;
  }
  seenIds.add(id);

  let properties: Record<string, unknown> = {};
  try {
    properties = await style.getProperties({ breakpoint: "main" });
  } catch (err) {
    console.error(`Error getting properties for style ${trimmedName}:`, err);
  }

  uniqueStyles.push({
    id,
    name: trimmedName,
    properties,
    order: index,
    isCombo,
    detectionSource,
  });
  if (debug) console.log(`Added unique style: ${trimmedName} (ID: ${id})`);
}

async function collectUniqueAppliedStyles(appliedStyles: Style[], debug: boolean): Promise<StyleInfo[]> {
  const seenIds = new Set<string>();
  const uniqueStyles: StyleInfo[] = [];

  if (debug) console.log("Processing applied styles...");
  for (let i = 0; i < appliedStyles.length; i++) {
    try {
      await appendUniqueAppliedStyleIfNew(appliedStyles[i], i, seenIds, uniqueStyles, debug);
    } catch (err) {
      console.error(`Error processing applied style at index ${i}:`, err);
    }
  }
  return uniqueStyles;
}

async function detectComboFromStyle(
  style: Style,
  trimmedName: string
): Promise<{ isCombo: boolean; detectionSource: "api" | "heuristic" }> {
  if (typeof style.isComboClass === "function") {
    try {
      const isCombo = await style.isComboClass();
      return { isCombo, detectionSource: "api" };
    } catch {
      return { isCombo: COMBO_NAME_HEURISTIC.test(trimmedName), detectionSource: "heuristic" };
    }
  }
  return { isCombo: COMBO_NAME_HEURISTIC.test(trimmedName), detectionSource: "heuristic" };
}

async function mapAllStylesEntry(style: Style, index: number): Promise<StyleInfo> {
  try {
    const name = await style.getName();
    const trimmed = name?.trim() || "";
    const { isCombo, detectionSource } = await detectComboFromStyle(style, trimmed);
    let properties: Record<string, unknown> = {};
    try {
      properties = await style.getProperties({ breakpoint: "main" });
    } catch (err) {
      if (DEBUG) console.error(`Error getting properties for style ${name}:`, err);
    }
    return {
      id: style.id,
      name: trimmed,
      properties,
      order: index,
      isCombo,
      detectionSource,
    };
  } catch (err) {
    if (DEBUG) console.error(`Error getting name for style at index ${index}, ID ${style.id}:`, err);
    return {
      id: style.id,
      name: "",
      properties: {},
      order: index,
      isCombo: false,
    };
  }
}

export const createStyleService = () => {
  const getAllStylesWithProperties = (): Promise<StyleInfo[]> => {
    let cachedAllStylesPromise = getStyleServiceCache();
    if (!cachedAllStylesPromise) {
      if (DEBUG) console.log("Fetching ALL styles from the entire Webflow site...");
      cachedAllStylesPromise = (async () => {
        const allStyles = await webflow.getAllStyles();
        if (DEBUG) console.log(`Retrieved ${allStyles.length} styles from webflow.getAllStyles()`);

        if (DEBUG) console.log("Extracting names and properties from all styles...");
        const allStylesWithProperties = await Promise.all(
          allStyles.map((style, index) => mapAllStylesEntry(style as unknown as Style, index))
        );

        const validStyles = allStylesWithProperties.filter((style) => style.name);
        if (DEBUG)
          console.log(`Found ${validStyles.length} valid styles with names out of ${allStyles.length} total styles`);

        return validStyles.map((style, index) => ({
          ...style,
          order: index,
        }));
      })();
      setStyleServiceCache(cachedAllStylesPromise);
    }

    return cachedAllStylesPromise as Promise<StyleInfo[]>;
  };

  const getAppliedStyles = async (element: any): Promise<StyleInfo[]> => {
    if (DEBUG) console.log("Getting styles applied to the selected element...");

    if (!element || typeof element.getStyles !== "function") {
      console.error("Element does not have getStyles method", element);
      return [];
    }

    let appliedStyles: Style[] = [];
    try {
      appliedStyles = await element.getStyles();
      if (DEBUG) console.log(`Retrieved ${appliedStyles?.length || 0} styles applied to the selected element`);
    } catch (err) {
      console.error("Error calling element.getStyles():", err);
      return [];
    }

    if (!appliedStyles?.length) {
      return [];
    }

    return collectUniqueAppliedStyles(appliedStyles, DEBUG);
  };

  // Lightweight helper: only fetch class names for an element (no properties)
  const getAppliedClassNames = async (element: any): Promise<string[]> => {
    if (!element || typeof element.getStyles !== "function") {
      return [];
    }
    let styles: Style[] = [];
    try {
      styles = await element.getStyles();
    } catch {
      return [];
    }
    if (!styles?.length) return [];

    const seen = new Set<string>();
    const names = await Promise.all(
      styles.map(async (s) => {
        try {
          const n = await s.getName();
          const t = n?.trim() || "";
          return t;
        } catch {
          return "";
        }
      })
    );
    const deduped: string[] = [];
    for (const n of names) {
      if (n && !seen.has(n)) {
        seen.add(n);
        deduped.push(n);
      }
    }
    return deduped;
  };

  const getAppliedStylesWithElementId = async (element: any): Promise<StyleWithElement[]> => {
    const styles = await getAppliedStyles(element);
    const elementId = toElementKey(element);
    return styles.map((style) => ({ ...style, elementId }));
  };

  const sortStylesByType = (styles: StyleInfo[]): StyleInfo[] => {
    return [...styles].sort((a, b) => {
      const aIsCombo = a.isCombo === true;
      const bIsCombo = b.isCombo === true;
      if (aIsCombo !== bIsCombo) return aIsCombo ? 1 : -1;
      return a.order - b.order;
    });
  };

  return {
    getAllStylesWithProperties,
    getAppliedStyles,
    getAppliedStylesWithElementId,
    sortStylesByType,
    getAppliedClassNames,
  } as const;
};

export type StyleService = ReturnType<typeof createStyleService>;
