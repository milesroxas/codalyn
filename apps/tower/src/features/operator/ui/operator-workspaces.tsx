"use client";

import {
  IconBuilding,
  IconChevronLeft,
  IconChevronRight,
  IconCreditCard,
  IconMail,
  IconRefresh,
  IconSearch,
  IconUsers,
} from "@tabler/icons-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { OperatorApiError, operatorApi } from "@/features/operator/api/client";
import { formatRelative } from "@/features/operator/model/format";
import { OperatorUsageLimitsTableCell } from "@/features/operator/ui/operator-usage-limits-section";
import { OperatorWorkspaceDetailSheet } from "@/features/operator/ui/operator-workspace-detail";
import type { OperatorWorkspaceRow } from "@/server/operator/types";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Skeleton } from "@/shared/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { TablePaginationSummarySkeleton } from "@/shared/ui/table-pagination-skeleton";

const DEFAULT_LIMIT = 25;

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export function OperatorWorkspaces() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id");

  const [query, setQuery] = useState("");
  const [plan, setPlan] = useState("");
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);

  const [rows, setRows] = useState<OperatorWorkspaceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const detailOpen = selectedId !== null;

  const debouncedQuery = useDebouncedValue(query, 200);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await operatorApi.listWorkspaces({
        q: debouncedQuery || undefined,
        limit: DEFAULT_LIMIT,
        offset,
        billingPlan: plan.trim() || undefined,
        subscriptionStatus: status.trim() || undefined,
      });
      setRows(res.rows);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof OperatorApiError ? err.message : "Could not load workspaces");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, offset, plan, status]);

  useEffect(() => {
    void load();
  }, [load]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset pagination on filter change
  useEffect(() => {
    setOffset(0);
  }, [debouncedQuery, plan, status]);

  const onOpenDetail = (id: string) => {
    setSelectedId(id);
    const params = new URLSearchParams(searchParams.toString());
    params.set("id", id);
    router.replace(`/console/workspaces?${params.toString()}`, { scroll: false });
  };

  const onCloseDetail = () => {
    setSelectedId(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("id");
    const q = params.toString();
    router.replace(q ? `/console/workspaces?${q}` : "/console/workspaces", { scroll: false });
  };

  const onUpdated = (row: OperatorWorkspaceRow) => {
    setRows((current) => current.map((r) => (r.id === row.id ? row : r)));
  };

  const onDeleted = (id: string) => {
    setRows((current) => current.filter((r) => r.id !== id));
    setTotal((t) => Math.max(0, t - 1));
  };

  const pageCount = Math.max(1, Math.ceil(total / DEFAULT_LIMIT));
  const pageIndex = Math.floor(offset / DEFAULT_LIMIT);
  const hasPrev = pageIndex > 0;
  const hasNext = pageIndex < pageCount - 1;
  const nf = useMemo(() => new Intl.NumberFormat(), []);

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Operator</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Workspaces</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Every workspace in the product. Adjust seat limits, billing metadata, and review members or pending invites.
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 min-w-64">
          <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, slug, or id"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={plan}
            onChange={(event) => setPlan(event.target.value)}
            placeholder="Plan filter"
            className="h-9 w-36"
          />
          <Input
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            placeholder="Status filter"
            className="h-9 w-36"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => void load()}
            disabled={loading}
          >
            <IconRefresh className={loading ? "size-4 animate-spin" : "size-4"} />
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Workspace</TableHead>
              <TableHead>Billing</TableHead>
              <TableHead className="text-right">Seats</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead className="text-right">Members</TableHead>
              <TableHead className="text-right">Pending</TableHead>
              <TableHead className="text-right">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <WorkspacesTableBody rows={rows} loading={loading} selectedId={selectedId} onOpen={onOpenDetail} />
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <div>
          {loading ? (
            <TablePaginationSummarySkeleton />
          ) : (
            `Showing ${rows.length === 0 ? 0 : offset + 1}–${offset + rows.length} of ${nf.format(total)}`
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasPrev || loading}
            onClick={() => setOffset((o) => Math.max(0, o - DEFAULT_LIMIT))}
            className="gap-1.5"
          >
            <IconChevronLeft className="size-4" />
            Prev
          </Button>
          <span className="tabular-nums">
            Page {pageIndex + 1} / {pageCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasNext || loading}
            onClick={() => setOffset((o) => o + DEFAULT_LIMIT)}
            className="gap-1.5"
          >
            Next
            <IconChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <OperatorWorkspaceDetailSheet
        workspaceId={selectedId}
        open={detailOpen}
        onOpenChange={(next) => {
          if (!next) {
            onCloseDetail();
          }
        }}
        onUpdated={onUpdated}
        onDeleted={onDeleted}
      />
    </div>
  );
}

function WorkspacesTableBody({
  rows,
  loading,
  selectedId,
  onOpen,
}: {
  rows: OperatorWorkspaceRow[];
  loading: boolean;
  selectedId: string | null;
  onOpen: (id: string) => void;
}) {
  if (loading && rows.length === 0) {
    return (
      <>
        {Array.from({ length: 6 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows
          <TableRow key={`sk-${i}`}>
            <TableCell>
              <div className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-md" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-24" />
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="ml-auto h-4 w-10" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-10 w-28" />
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="ml-auto h-4 w-8" />
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="ml-auto h-4 w-8" />
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="ml-auto h-4 w-16" />
            </TableCell>
          </TableRow>
        ))}
      </>
    );
  }
  if (rows.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={7}>
          <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <span className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <IconBuilding className="size-5" />
            </span>
            <p className="text-sm font-medium text-foreground">No workspaces match these filters.</p>
          </div>
        </TableCell>
      </TableRow>
    );
  }
  return (
    <>
      {rows.map((w) => (
        <WorkspaceRow key={w.id} workspace={w} selected={selectedId === w.id} onOpen={onOpen} />
      ))}
    </>
  );
}

function WorkspaceRow({
  workspace,
  selected,
  onOpen,
}: {
  workspace: OperatorWorkspaceRow;
  selected: boolean;
  onOpen: (id: string) => void;
}) {
  const hasBilling = Boolean(workspace.billingPlan || workspace.subscriptionStatus);
  return (
    <TableRow
      className="cursor-pointer"
      onClick={() => onOpen(workspace.id)}
      data-state={selected ? "selected" : undefined}
    >
      <TableCell>
        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <IconBuilding className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{workspace.name}</p>
            <p className="truncate font-mono text-xs text-muted-foreground">{workspace.slug}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {workspace.billingPlan ? (
            <Badge variant="secondary" className="gap-1">
              <IconCreditCard className="size-3" />
              {workspace.billingPlan}
            </Badge>
          ) : null}
          {workspace.subscriptionStatus ? <Badge variant="outline">{workspace.subscriptionStatus}</Badge> : null}
          {!hasBilling ? <span className="text-xs text-muted-foreground">—</span> : null}
        </div>
      </TableCell>
      <TableCell className="text-right text-sm tabular-nums text-foreground">
        {workspace.seatLimit ?? workspace.effectiveSeatLimit}
      </TableCell>
      <TableCell>
        <OperatorUsageLimitsTableCell usage={workspace.usage} />
      </TableCell>
      <TableCell className="text-right text-sm tabular-nums text-foreground">
        <span className="inline-flex items-center gap-1">
          <IconUsers className="size-3 text-muted-foreground" />
          {workspace.memberCount}
        </span>
      </TableCell>
      <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
        {workspace.pendingInvitations > 0 ? (
          <span className="inline-flex items-center gap-1">
            <IconMail className="size-3" />
            {workspace.pendingInvitations}
          </span>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="text-right text-xs text-muted-foreground">{formatRelative(workspace.createdAt)}</TableCell>
    </TableRow>
  );
}
