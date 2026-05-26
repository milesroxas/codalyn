"use client";

import { WORKSPACE_SLUG_HINT } from "@/shared/lib/membership/workspace-slug";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

export type WorkspaceSlugFieldProps = {
  id: string;
  value: string;
  currentSlug: string;
  disabled?: boolean;
  busy?: boolean;
  onChange: (next: string) => void;
  onSave: () => void;
};

export function WorkspaceSlugField(props: WorkspaceSlugFieldProps) {
  const { id, value, currentSlug, disabled = false, busy = false, onChange, onSave } = props;
  const saveDisabled = disabled || busy || value.trim() === "" || value.trim() === currentSlug;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Slug</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          value={value}
          disabled={disabled || busy}
          autoComplete="off"
          spellCheck={false}
          className="font-mono"
          onChange={(event) => onChange(event.target.value)}
        />
        <Button type="button" size="sm" variant="outline" disabled={saveDisabled} onClick={onSave}>
          Save
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{WORKSPACE_SLUG_HINT}</p>
    </div>
  );
}
