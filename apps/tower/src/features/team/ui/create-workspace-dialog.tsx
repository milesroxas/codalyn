"use client";

import type { FormEvent } from "react";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

type CreateWorkspaceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgName: string;
  onOrgNameChange: (value: string) => void;
  busy: boolean;
  onSubmit: (event: FormEvent) => Promise<boolean>;
};

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
  orgName,
  onOrgNameChange,
  busy,
  onSubmit,
}: CreateWorkspaceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New workspace</DialogTitle>
          <DialogDescription>Each workspace has its own Webflow, presets, and team.</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const ok = await onSubmit(event);
            if (ok) {
              onOpenChange(false);
            }
          }}
        >
          <FormField>
            <Label htmlFor="tower-create-workspace-name">Workspace name</Label>
            <Input
              id="tower-create-workspace-name"
              value={orgName}
              onChange={(event) => onOrgNameChange(event.target.value)}
              placeholder="Acme Studio"
              autoComplete="organization"
              autoFocus
            />
          </FormField>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !orgName.trim()}>
              Create workspace
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
