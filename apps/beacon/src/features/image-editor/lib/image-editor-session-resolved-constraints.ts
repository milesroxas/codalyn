import type { ExportConstraints, ResolverOutput } from "@codalyn/webflow-kit";

export type SessionResolvedConstraintsApplication = {
  shouldApply: boolean;
  constraints: ExportConstraints | null;
  taggedDimensionsActive: boolean;
  maxFileSizeBytes: number | null;
  source: ResolverOutput["source"] | "manual";
};

export function resolveSessionResolvedConstraintsApplication(input: {
  enabled: boolean;
  imageSrc: string | null;
  readout: ResolverOutput | null;
}): SessionResolvedConstraintsApplication {
  const { enabled, imageSrc, readout } = input;
  const constraints = readout?.constraints ?? null;
  const hasAmbiguousCmsBindingBlocker = readout?.blockers.includes("ambiguous-cms-binding") ?? false;
  const taggedDimensionsActive = readout?.source === "tagged";
  const shouldApply =
    enabled &&
    imageSrc != null &&
    readout != null &&
    constraints != null &&
    readout.source !== "manual" &&
    !hasAmbiguousCmsBindingBlocker;

  return {
    shouldApply,
    constraints,
    taggedDimensionsActive,
    maxFileSizeBytes: constraints?.maxFileSizeBytes ?? null,
    source: readout?.source ?? "manual",
  };
}
