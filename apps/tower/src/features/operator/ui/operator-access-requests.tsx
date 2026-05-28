"use client";

import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";

import { IconCheck, IconKey, IconMail, IconX } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { OperatorApiError, operatorApi } from "@/features/operator/api/client";
import { formatRelative } from "@/features/operator/model/format";
import { useOperatorMetrics } from "@/features/operator/model/operator-metrics-provider";
import { OperatorPendingReviewAlert } from "@/features/operator/ui/operator-pending-review-alert";
import { earlyAccessRequestDisplayName } from "@/shared/lib/access/early-access-request-name";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

const ACCESS_REQUEST_SKELETON_ROWS = ["one", "two", "three"] as const;
const ACCESS_REQUEST_SKELETON_COLS = ["email", "name", "referral", "requested", "actions"] as const;

export function OperatorAccessRequests() {
  const { metrics, refresh: refreshMetrics } = useOperatorMetrics();
  const [rows, setRows] = useState<Awaited<ReturnType<typeof operatorApi.listEarlyAccessRequests>>["rows"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await operatorApi.listEarlyAccessRequests("pending");
      setRows(res.rows);
      await refreshMetrics();
    } catch (err) {
      setError(err instanceof OperatorApiError ? err.message : "Could not load access requests");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [refreshMetrics]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onApprove(id: string) {
    setBusyId(id);
    try {
      const res = await operatorApi.resolveEarlyAccessRequest(id, "approve");
      toast.success(res.inviteUrl ? "Approved — invite email sent" : "Approved — sign-in email sent");
      if (res.inviteUrl) {
        await navigator.clipboard.writeText(res.inviteUrl);
        toast.message("Invite link copied");
      }
      await load();
    } catch (err) {
      toast.error(err instanceof OperatorApiError ? err.message : "Could not approve request");
    } finally {
      setBusyId(null);
    }
  }

  async function onDismiss(id: string) {
    setBusyId(id);
    try {
      await operatorApi.resolveEarlyAccessRequest(id, "dismiss");
      toast.success("Request dismissed");
      await load();
    } catch (err) {
      toast.error(err instanceof OperatorApiError ? err.message : "Could not dismiss request");
    } finally {
      setBusyId(null);
    }
  }

  const pendingCount = metrics?.totals.pendingEarlyAccessRequests ?? rows.length;
  const showTablePlaceholder = useDeferredLoadingIndicator(loading);

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Operator</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Early access requests</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Approve grants access and sends an approval email with a sign-up or sign-in link. Access is stored on the user
          record when they sign up or sign in.
        </p>
      </div>

      {pendingCount > 0 ? (
        <OperatorPendingReviewAlert
          icon={<IconKey aria-hidden />}
          title={pendingCount === 1 ? "1 request awaiting review" : `${pendingCount} requests awaiting review`}
          description="Review each request below. Operators are also notified by email when a new request is submitted."
        />
      ) : null}

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Referral</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {showTablePlaceholder
              ? ACCESS_REQUEST_SKELETON_ROWS.map((rowKey) => (
                  <TableRow key={`sk-row-${rowKey}`}>
                    {ACCESS_REQUEST_SKELETON_COLS.map((colKey) => (
                      <TableCell key={`sk-row-${rowKey}-${colKey}`}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : null}
            {!loading && rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  No pending requests.
                </TableCell>
              </TableRow>
            ) : null}
            {!loading
              ? rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <IconMail className="size-4 text-muted-foreground" />
                        <span className="font-medium">{row.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>{earlyAccessRequestDisplayName(row) ?? "—"}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{row.note ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{formatRelative(row.createdAt)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="gap-1.5"
                          disabled={busyId === row.id}
                          onClick={() => void onApprove(row.id)}
                        >
                          <IconCheck className="size-3.5" />
                          Approve
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          disabled={busyId === row.id}
                          onClick={() => void onDismiss(row.id)}
                        >
                          <IconX className="size-3.5" />
                          Dismiss
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
