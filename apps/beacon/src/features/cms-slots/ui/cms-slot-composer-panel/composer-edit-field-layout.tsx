import type * as React from "react";
import { cn } from "@/shared/lib/utils";
import { Label } from "@/shared/ui/label";

/**
 * Field-layout atoms owned by the Composer slot edit sub-view (plain divs). This sub-view used to be an alert
 * dialog and borrowed the dialog's form atoms; it now stands on its own as an app view, so it owns its field
 * presentation here instead of reaching into `shared/ui/alert-dialog`.
 */

/** Groups a run of {@link ComposerEditField}s, optionally fenced off from the field above with a top divider. */
export function ComposerEditFieldSection({
  className,
  divider = false,
  ...props
}: React.ComponentProps<"div"> & { divider?: boolean }) {
  return (
    <div
      data-slot="composer-edit-field-section"
      className={cn(divider && "space-y-3 border-t border-border/50 pt-3", className)}
      {...props}
    />
  );
}

/**
 * Compact section heading above a run of {@link ComposerEditField}s — clusters fields by group/folder. Tight
 * vertical rhythm (no top pad on the first label) keeps the grouped form compact.
 */
export function ComposerEditGroupLabel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="composer-edit-group-label"
      className={cn(
        "pt-1.5 pb-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80 first:pt-0",
        className
      )}
      {...props}
    />
  );
}

/** A labelled field row: label (with optional trailing meta) stacked above its control. */
export function ComposerEditField(props: {
  label: React.ReactNode;
  labelHtmlFor: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { label, labelHtmlFor, meta, children } = props;

  return (
    <div className="space-y-0.5" data-slot="composer-edit-field">
      <Label className="text-xs text-muted-foreground" htmlFor={labelHtmlFor}>
        <span className="min-w-0 truncate">{label}</span>
        {meta != null ? (
          <span className="ml-auto text-[10px] text-muted-foreground/70" data-slot="composer-edit-field-meta">
            {meta}
          </span>
        ) : null}
      </Label>
      {children}
    </div>
  );
}
