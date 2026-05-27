"use client";

import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";

import {
  IconBan,
  IconChevronLeft,
  IconChevronRight,
  IconCircleCheck,
  IconMail,
  IconMailCheck,
  IconRefresh,
  IconSearch,
  IconShieldCheck,
  IconUsers,
} from "@tabler/icons-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { authClient } from "@/features/auth/model/auth-client";
import { OperatorApiError, operatorApi } from "@/features/operator/api/client";
import { appRoleLabel, formatRelative, initialsFor } from "@/features/operator/model/format";
import { OperatorCustomerDetail } from "@/features/operator/ui/operator-customer-detail";
import { OperatorInviteCustomer } from "@/features/operator/ui/operator-invite-customer";
import { OperatorUsageLimitsTableCell } from "@/features/operator/ui/operator-usage-limits-section";
import type { OperatorUserRow } from "@/server/operator/types";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { TablePaginationSummarySkeleton } from "@/shared/ui/table-pagination-skeleton";

const DEFAULT_LIMIT = 25;

type RoleFilter = "all" | "user" | "product_admin";
type TriFilter = "any" | "true" | "false";

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export function OperatorCustomers() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id");

  const { data: session } = authClient.useSession();
  const currentOperatorId = session?.user?.id ?? "";

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [banned, setBanned] = useState<TriFilter>("any");
  const [eligible, setEligible] = useState<TriFilter>("any");
  const [verified, setVerified] = useState<TriFilter>("any");
  const [offset, setOffset] = useState(0);

  const [rows, setRows] = useState<OperatorUserRow[]>([]);
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
      const res = await operatorApi.listUsers({
        q: debouncedQuery || undefined,
        limit: DEFAULT_LIMIT,
        offset,
        role: roleFilter === "all" ? undefined : roleFilter,
        banned: banned === "any" ? undefined : banned === "true",
        canCreateOrganization: eligible === "any" ? undefined : eligible === "true",
        emailVerified: verified === "any" ? undefined : verified === "true",
      });
      setRows(res.rows);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof OperatorApiError ? err.message : "Could not load customers");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, offset, roleFilter, banned, eligible, verified]);

  useEffect(() => {
    void load();
  }, [load]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset pagination on filter change
  useEffect(() => {
    setOffset(0);
  }, [debouncedQuery, roleFilter, banned, eligible, verified]);

  const onOpenDetail = (id: string) => {
    setSelectedId(id);
    const params = new URLSearchParams(searchParams.toString());
    params.set("id", id);
    router.replace(`/console/customers?${params.toString()}`, { scroll: false });
  };

  const onCloseDetail = () => {
    setSelectedId(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("id");
    const q = params.toString();
    router.replace(q ? `/console/customers?${q}` : "/console/customers", { scroll: false });
  };

  const onUpdated = (row: OperatorUserRow) => {
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
  const showPaginationSkeleton = useDeferredLoadingIndicator(loading);

  const nf = useMemo(() => new Intl.NumberFormat(), []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Operator</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Customers</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Every account in the product. Invite new customers, grant workspace eligibility, change role, and moderate.
          </p>
        </div>
        <OperatorInviteCustomer onInvited={() => void load()} />
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 min-w-64">
          <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by email, name, or id"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            leadingIcon
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as RoleFilter)}>
            <SelectTrigger size="sm" width="filter">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="user">Users</SelectItem>
              <SelectItem value="product_admin">Operators</SelectItem>
            </SelectContent>
          </Select>
          <Select value={banned} onValueChange={(v) => setBanned(v as TriFilter)}>
            <SelectTrigger size="sm" width="filter">
              <SelectValue placeholder="Banned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any status</SelectItem>
              <SelectItem value="true">Banned</SelectItem>
              <SelectItem value="false">Not banned</SelectItem>
            </SelectContent>
          </Select>
          <Select value={eligible} onValueChange={(v) => setEligible(v as TriFilter)}>
            <SelectTrigger size="sm" width="filterLg">
              <SelectValue placeholder="Eligible" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any eligibility</SelectItem>
              <SelectItem value="true">Can create workspace</SelectItem>
              <SelectItem value="false">Cannot create</SelectItem>
            </SelectContent>
          </Select>
          <Select value={verified} onValueChange={(v) => setVerified(v as TriFilter)}>
            <SelectTrigger size="sm" width="filterMd">
              <SelectValue placeholder="Verified" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any verification</SelectItem>
              <SelectItem value="true">Email verified</SelectItem>
              <SelectItem value="false">Unverified</SelectItem>
            </SelectContent>
          </Select>
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
              <TableHead>Customer</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Flags</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead className="text-right">Workspaces</TableHead>
              <TableHead className="text-right">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <CustomersTableBody rows={rows} loading={loading} selectedId={selectedId} onOpen={onOpenDetail} />
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <div>
          {showPaginationSkeleton ? (
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

      <OperatorCustomerDetail
        userId={selectedId}
        open={detailOpen}
        onOpenChange={(next) => {
          if (!next) {
            onCloseDetail();
          }
        }}
        currentOperatorId={currentOperatorId}
        onUpdated={onUpdated}
        onDeleted={onDeleted}
      />
    </div>
  );
}

function CustomersTableBody({
  rows,
  loading,
  selectedId,
  onOpen,
}: {
  rows: OperatorUserRow[];
  loading: boolean;
  selectedId: string | null;
  onOpen: (id: string) => void;
}) {
  const showPlaceholder = useDeferredLoadingIndicator(loading && rows.length === 0);
  if (showPlaceholder) {
    return (
      <>
        {Array.from({ length: 6 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows
          <TableRow key={`sk-${i}`}>
            <TableCell>
              <div className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-16" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-24" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-10 w-28" />
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
        <TableCell colSpan={6}>
          <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <span className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <IconUsers className="size-5" />
            </span>
            <p className="text-sm font-medium text-foreground">No customers match these filters.</p>
            <p className="text-xs">Adjust the search, or invite one to get started.</p>
          </div>
        </TableCell>
      </TableRow>
    );
  }
  return (
    <>
      {rows.map((u) => (
        <CustomerRow key={u.id} user={u} selected={selectedId === u.id} onOpen={onOpen} />
      ))}
    </>
  );
}

function CustomerRow({
  user,
  selected,
  onOpen,
}: {
  user: OperatorUserRow;
  selected: boolean;
  onOpen: (id: string) => void;
}) {
  const noFlags = !user.banned && !user.canCreateOrganization && !user.emailVerified;
  return (
    <TableRow className="cursor-pointer" onClick={() => onOpen(user.id)} data-state={selected ? "selected" : undefined}>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarFallback>{initialsFor(user.name || user.email)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{user.name || user.email}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        {user.role === "product_admin" ? (
          <Badge variant="secondary" className="gap-1">
            <IconShieldCheck className="size-3" />
            {appRoleLabel(user.role)}
          </Badge>
        ) : (
          <Badge variant="outline">User</Badge>
        )}
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {user.banned ? (
            <Badge variant="destructive" className="gap-1">
              <IconBan className="size-3" />
              Banned
            </Badge>
          ) : null}
          {user.canCreateOrganization ? (
            <Badge variant="outline" className="gap-1">
              <IconCircleCheck className="size-3" />
              Eligible
            </Badge>
          ) : null}
          <VerifiedBadge verified={user.emailVerified} />
          {noFlags ? <span className="text-xs text-muted-foreground">—</span> : null}
        </div>
      </TableCell>
      <TableCell>
        <OperatorUsageLimitsTableCell usage={user.usage} />
      </TableCell>
      <TableCell className="text-right text-sm tabular-nums text-foreground">{user.memberships}</TableCell>
      <TableCell className="text-right text-xs text-muted-foreground">{formatRelative(user.createdAt)}</TableCell>
    </TableRow>
  );
}

function VerifiedBadge({ verified }: { verified: boolean }) {
  if (verified) {
    return (
      <Badge variant="outline" className="gap-1">
        <IconMailCheck className="size-3" />
        Verified
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 opacity-60">
      <IconMail className="size-3" />
      Unverified
    </Badge>
  );
}
