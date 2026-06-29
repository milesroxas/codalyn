"use client";

import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";

import { IconCheck, IconKey, IconMail, IconX } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { OperatorApiError, operatorApi } from "@/features/operator/api/client";
import {
  type EarlyAccessRequestStatusFilter,
  earlyAccessRequestApprovalUrl,
  earlyAccessRequestEmptyMessage,
  earlyAccessRequestStatusLabel,
  OPERATOR_ACCESS_REQUEST_APPROVE_ERROR,
  OPERATOR_ACCESS_REQUEST_APPROVE_LABEL,
  OPERATOR_ACCESS_REQUEST_APPROVE_SUCCESS_INVITE,
  OPERATOR_ACCESS_REQUEST_APPROVE_SUCCESS_SIGN_IN,
  OPERATOR_ACCESS_REQUEST_DECLINE_ERROR,
  OPERATOR_ACCESS_REQUEST_DECLINE_LABEL,
  OPERATOR_ACCESS_REQUEST_DECLINE_REASON_REQUIRED,
  OPERATOR_ACCESS_REQUEST_DECLINE_SUCCESS,
  OPERATOR_ACCESS_REQUEST_LOAD_ERROR,
} from "@/features/operator/lib/operator-access-request-copy";
import { formatRelative } from "@/features/operator/model/format";
import { useOperatorMetrics } from "@/features/operator/model/operator-metrics-provider";
import {
  DeclineAccessRequestDialog,
  type DeclineAccessRequestTarget,
} from "@/features/operator/ui/decline-access-request-dialog";
import { OperatorAccessRequestApprovedActions } from "@/features/operator/ui/operator-access-request-approved-actions";
import { OperatorPendingReviewAlert } from "@/features/operator/ui/operator-pending-review-alert";
import { earlyAccessRequestDisplayName } from "@/shared/lib/access/early-access-request-name";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { ButtonGroup } from "@/shared/ui/button-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

type EarlyAccessRequestRow = Awaited<ReturnType<typeof operatorApi.listEarlyAccessRequests>>["rows"][number];

const ACCESS_REQUEST_SKELETON_ROWS = ["one", "two", "three"] as const;
const ACCESS_REQUEST_SKELETON_COLS = [
  "email",
  "name",
  "referral",
  "status",
  "requested",
  "resolved",
  "actions",
] as const;

function accessRequestStatusBadgeVariant(status: string): "default" | "secondary" | "outline" {
  if (status === "pending") {
    return "default";
  }
  if (status === "approved") {
    return "secondary";
  }
  return "outline";
}

export function OperatorAccessRequests() {
  const { metrics, refresh: refreshMetrics } = useOperatorMetrics();
  const [rows, setRows] = useState<EarlyAccessRequestRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<EarlyAccessRequestStatusFilter>("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [declineTarget, setDeclineTarget] = useState<DeclineAccessRequestTarget | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await operatorApi.listEarlyAccessRequests(statusFilter);
      setRows(res.rows);
      if (statusFilter === "pending") {
        await refreshMetrics();
      }
    } catch (err) {
      setError(err instanceof OperatorApiError ? err.message : OPERATOR_ACCESS_REQUEST_LOAD_ERROR);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, refreshMetrics]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onApprove(id: string) {
    setBusyId(id);
    try {
      const res = await operatorApi.resolveEarlyAccessRequest(id, "approve");
      toast.success(
        res.inviteUrl ? OPERATOR_ACCESS_REQUEST_APPROVE_SUCCESS_INVITE : OPERATOR_ACCESS_REQUEST_APPROVE_SUCCESS_SIGN_IN
      );
      const approvalUrl = earlyAccessRequestApprovalUrl(res);
      if (approvalUrl) {
        await navigator.clipboard.writeText(approvalUrl);
        toast.message("Invite link copied");
      }
      await load();
    } catch (err) {
      toast.error(err instanceof OperatorApiError ? err.message : OPERATOR_ACCESS_REQUEST_APPROVE_ERROR);
    } finally {
      setBusyId(null);
    }
  }

  async function onConfirmDecline(id: string, reason: string) {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      toast.error(OPERATOR_ACCESS_REQUEST_DECLINE_REASON_REQUIRED);
      return;
    }

    setBusyId(id);
    try {
      await operatorApi.resolveEarlyAccessRequest(id, "dismiss", trimmedReason);
      toast.success(OPERATOR_ACCESS_REQUEST_DECLINE_SUCCESS);
      setDeclineTarget(null);
      setDeclineReason("");
      await load();
    } catch (err) {
      toast.error(err instanceof OperatorApiError ? err.message : OPERATOR_ACCESS_REQUEST_DECLINE_ERROR);
    } finally {
      setBusyId(null);
    }
  }

  const pendingCount = metrics?.totals.pendingEarlyAccessRequests ?? 0;
  const showTablePlaceholder = useDeferredLoadingIndicator(loading);
  const showPendingAlert = statusFilter === "pending" && pendingCount > 0;

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Operator</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Early access requests</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Approve access sends an approval email with a sign-up or sign-in link. Decline sends the requester an email
          with your reason and removes the request from review.
        </p>
      </div>

      <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as EarlyAccessRequestStatusFilter)}>
        <SelectTrigger size="sm" width="filterLg" aria-label="Filter by status">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="dismissed">Declined</SelectItem>
          <SelectItem value="all">All statuses</SelectItem>
        </SelectContent>
      </Select>

      {showPendingAlert ? (
        <OperatorPendingReviewAlert
          icon={<IconKey aria-hidden />}
          title={pendingCount === 1 ? "1 request awaiting review" : `${pendingCount} requests awaiting review`}
          description="Review each request below. Operators are also notified by email when a new request is submitted."
        />
      ) : null}

      {error ? (
        <div className="rounded-sm border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="rounded-sm border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Referral</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead>Resolved</TableHead>
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
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  {earlyAccessRequestEmptyMessage(statusFilter)}
                </TableCell>
              </TableRow>
            ) : null}
            {!loading
              ? rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <IconMail className="size-4 text-muted-foreground" aria-hidden />
                        <span className="font-medium">{row.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>{earlyAccessRequestDisplayName(row) ?? "—"}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{row.note ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={accessRequestStatusBadgeVariant(row.status)}>
                        {earlyAccessRequestStatusLabel(row.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{formatRelative(row.createdAt)}</Badge>
                    </TableCell>
                    <TableCell>
                      {row.resolvedAt ? (
                        <Badge variant="outline">{formatRelative(row.resolvedAt)}</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.status === "pending" ? (
                        <div className="flex justify-end">
                          <ButtonGroup>
                            <Button
                              type="button"
                              size="sm"
                              disabled={busyId === row.id}
                              onClick={() => void onApprove(row.id)}
                            >
                              <IconCheck aria-hidden data-icon="inline-start" />
                              {OPERATOR_ACCESS_REQUEST_APPROVE_LABEL}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              disabled={busyId === row.id}
                              onClick={() => {
                                setDeclineReason("");
                                setDeclineTarget({ id: row.id, email: row.email });
                              }}
                            >
                              <IconX aria-hidden data-icon="inline-start" />
                              {OPERATOR_ACCESS_REQUEST_DECLINE_LABEL}
                            </Button>
                          </ButtonGroup>
                        </div>
                      ) : row.status === "approved" ? (
                        <div className="flex justify-end">
                          <OperatorAccessRequestApprovedActions
                            requestId={row.id}
                            busy={busyId === row.id}
                            onBusyChange={setBusyId}
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              : null}
          </TableBody>
        </Table>
      </div>

      <DeclineAccessRequestDialog
        target={declineTarget}
        declineReason={declineReason}
        busy={busyId !== null}
        onDeclineReasonChange={setDeclineReason}
        onOpenChange={(open) => {
          if (!open) {
            setDeclineTarget(null);
            setDeclineReason("");
          }
        }}
        onConfirmDecline={(id, reason) => void onConfirmDecline(id, reason)}
      />
    </div>
  );
}
