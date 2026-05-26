"use client";

import { IconLifebuoy, IconMessageCircle } from "@tabler/icons-react";
import { useState } from "react";
import type { TowerSupportRequestKind } from "@/features/tower-ui/lib/tower-support-request";
import { TowerSupportRequestDialog } from "@/features/tower-ui/ui/tower-support-request-dialog";
import { Button } from "@/shared/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { FloatingActionButtonAnchor, FloatingActionButtonSlot } from "@/shared/ui/floating-action-button";

export function TowerSupportFab() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeDialog, setActiveDialog] = useState<TowerSupportRequestKind | null>(null);

  function openDialog(kind: TowerSupportRequestKind) {
    setMenuOpen(false);
    setActiveDialog(kind);
  }

  return (
    <FloatingActionButtonAnchor>
      <FloatingActionButtonSlot>
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="fab" aria-label="Help and feedback">
              <IconLifebuoy aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end">
            <DropdownMenuItem
              onSelect={() => {
                openDialog("feedback");
              }}
            >
              <IconMessageCircle aria-hidden />
              Submit feedback
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                openDialog("help");
              }}
            >
              <IconLifebuoy aria-hidden />
              Get help
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <TowerSupportRequestDialog
          kind="feedback"
          open={activeDialog === "feedback"}
          onOpenChange={(open) => {
            if (!open) {
              setActiveDialog(null);
            }
          }}
        />
        <TowerSupportRequestDialog
          kind="help"
          open={activeDialog === "help"}
          onOpenChange={(open) => {
            if (!open) {
              setActiveDialog(null);
            }
          }}
        />
      </FloatingActionButtonSlot>
    </FloatingActionButtonAnchor>
  );
}
