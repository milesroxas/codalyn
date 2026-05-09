/** Webflow Designer throws often include `err.cause.tag` (e.g. `ResourceMissing`, `InvalidElementPlacement`). */
export function webflowDesignerErrorCauseTag(err: unknown): string | undefined {
  const t = (err as { cause?: { tag?: string } } | null | undefined)?.cause?.tag;
  return typeof t === "string" ? t : undefined;
}

export function formatWebflowDesignerError(err: unknown): string {
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong. Check that you can edit the current page.";
}
