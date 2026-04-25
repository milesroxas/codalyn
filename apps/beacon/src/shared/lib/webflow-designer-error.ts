/** Webflow Designer throws often include `err.cause.tag` (e.g. `ResourceMissing`, `InvalidElementPlacement`). */
export function webflowDesignerErrorCauseTag(err: unknown): string | undefined {
  const t = (err as { cause?: { tag?: string } } | null | undefined)?.cause?.tag;
  return typeof t === "string" ? t : undefined;
}
