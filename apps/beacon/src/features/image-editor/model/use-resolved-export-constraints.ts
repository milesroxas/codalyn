import {
  type BeaconAppSettings,
  createBeaconPresetResolver,
  type ResolvedUploadTarget,
  type ResolverOutput,
} from "@codalyn/webflow-kit";
import { useMemo } from "react";
import { toBeaconPresetSettingsSnapshot } from "@/features/image-editor/lib/image-editor-resolved-target";

const presetResolver = createBeaconPresetResolver();

export function useResolvedExportConstraints(input: {
  enabled: boolean;
  settings: BeaconAppSettings | null;
  target: ResolvedUploadTarget | null;
}): ResolverOutput | null {
  const { enabled, settings, target } = input;
  const snapshot = useMemo(
    () => (enabled && settings != null ? toBeaconPresetSettingsSnapshot(settings) : null),
    [enabled, settings]
  );

  return useMemo(() => {
    if (snapshot == null || target == null) {
      return null;
    }
    return presetResolver.resolve({ settings: snapshot, target });
  }, [snapshot, target]);
}
