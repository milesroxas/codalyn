"use client";

import { IconCopy } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

export function WorkspaceIdentityCard(props: {
  activeOrg: { id: string; name: string; slug: string };
  membersCount: number;
  pendingInviteCount: number;
  /** When false, omit pending-invite counts (non-admins cannot act on invitations). */
  showPendingInvitesSummary?: boolean;
}) {
  const { activeOrg, membersCount, pendingInviteCount, showPendingInvitesSummary = true } = props;
  const [slugCopied, setSlugCopied] = useState(false);

  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm ring-1 ring-border/60 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="truncate text-xl font-semibold tracking-tight">{activeOrg.name}</h2>
          <Badge variant="secondary" className="font-mono text-xs">
            {activeOrg.slug}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {membersCount} member{membersCount === 1 ? "" : "s"}
          {showPendingInvitesSummary && pendingInviteCount > 0
            ? ` · ${pendingInviteCount} invite${pendingInviteCount === 1 ? "" : "s"} pending`
            : ""}
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="h-7 gap-1 text-muted-foreground"
            onClick={() => {
              void navigator.clipboard.writeText(activeOrg.slug);
              setSlugCopied(true);
              toast.success("Slug copied");
            }}
          >
            <IconCopy className="size-3.5" aria-hidden />
            {slugCopied ? "Copied" : "Copy slug"}
          </Button>
        </div>
      </div>
    </section>
  );
}
