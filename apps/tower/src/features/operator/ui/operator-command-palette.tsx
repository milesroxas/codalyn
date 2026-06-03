"use client";

import {
  IconBuilding,
  IconChartHistogram,
  IconChecks,
  IconDashboard,
  IconPlug,
  IconUser,
  IconUsers,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { operatorApi } from "@/features/operator/api/client";
import type { OperatorUserRow, OperatorWorkspaceRow } from "@/server/operator/types";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/shared/ui/command";

export type OperatorCommandPaletteProps = {
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
};

const pages = [
  { path: "/console", label: "Overview", icon: IconDashboard, hint: "g o" },
  { path: "/console/customers", label: "Customers", icon: IconUsers, hint: "g c" },
  { path: "/console/workspaces", label: "Workspaces", icon: IconBuilding, hint: "g w" },
  { path: "/console/usage", label: "Usage", icon: IconChartHistogram, hint: "g u" },
  { path: "/console/platform", label: "Platform", icon: IconPlug, hint: "g p" },
];

export function OperatorCommandPalette({ open, onOpenChange }: OperatorCommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<OperatorUserRow[]>([]);
  const [workspaces, setWorkspaces] = useState<OperatorWorkspaceRow[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setUsers([]);
      setWorkspaces([]);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setUsers([]);
      setWorkspaces([]);
      return;
    }
    let cancelled = false;
    setBusy(true);
    (async () => {
      try {
        const [u, w] = await Promise.all([
          operatorApi.listUsers({ q: trimmed, limit: 6 }),
          operatorApi.listWorkspaces({ q: trimmed, limit: 6 }),
        ]);
        if (!cancelled) {
          setUsers(u.rows);
          setWorkspaces(w.rows);
        }
      } catch {
        if (!cancelled) {
          setUsers([]);
          setWorkspaces([]);
        }
      } finally {
        if (!cancelled) {
          setBusy(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query, open]);

  const go = (path: string) => {
    onOpenChange(false);
    router.push(path);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Operator palette"
      description="Jump to pages, customers, and workspaces"
    >
      <CommandInput placeholder="Search customers, workspaces, pages…" value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>{busy ? "Searching…" : "No results"}</CommandEmpty>

        <CommandGroup heading="Pages">
          {pages.map((p) => {
            const Icon = p.icon;
            return (
              <CommandItem key={p.path} value={`page ${p.label}`} onSelect={() => go(p.path)}>
                <Icon className="text-muted-foreground" />
                <span>{p.label}</span>
                <CommandShortcut>{p.hint}</CommandShortcut>
              </CommandItem>
            );
          })}
        </CommandGroup>

        {users.length > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="Customers">
              {users.map((u) => (
                <CommandItem
                  key={u.id}
                  value={`user ${u.email} ${u.name} ${u.id}`}
                  onSelect={() => go(`/console/customers?id=${encodeURIComponent(u.id)}`)}
                >
                  <IconUser className="text-muted-foreground" />
                  <span className="truncate">{u.email}</span>
                  {u.role === "product_admin" ? (
                    <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <IconChecks className="size-3.5" />
                      operator
                    </span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}

        {workspaces.length > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="Workspaces">
              {workspaces.map((w) => (
                <CommandItem
                  key={w.id}
                  value={`workspace ${w.name} ${w.slug} ${w.id}`}
                  onSelect={() => go(`/console/workspaces?id=${encodeURIComponent(w.id)}`)}
                >
                  <IconBuilding className="text-muted-foreground" />
                  <span className="truncate">{w.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{w.memberCount} members</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}
      </CommandList>
    </CommandDialog>
  );
}
