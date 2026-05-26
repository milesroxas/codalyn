"use client";

import { IconCheck, IconLifebuoy, IconMail, IconMessageCircle, IconX } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { OperatorApiError, operatorApi } from "@/features/operator/api/client";
import { formatRelative } from "@/features/operator/model/format";
import { TOWER_SUPPORT_REQUEST_CONFIG, type TowerSupportRequestKind } from "@/shared/lib/support/tower-support-request";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Textarea } from "@/shared/ui/textarea";

type SupportRequestRow = Awaited<ReturnType<typeof operatorApi.listSupportRequests>>["rows"][number];
type StatusFilter = "pending" | "resolved" | "dismissed" | "all";
type KindFilter = "all" | TowerSupportRequestKind;
type PendingAction = { id: string; action: "resolve" | "dismiss" } | null;

const SUPPORT_REQUEST_SKELETON_ROWS = ["one", "two", "three"] as const;
const SUPPORT_REQUEST_SKELETON_COLS = ["kind", "topic", "email", "details", "status", "requested", "actions"] as const;

function kindLabel(kind: TowerSupportRequestKind): string {
  return kind === "feedback" ? "Feedback" : "Help";
}

function topicLabel(kind: TowerSupportRequestKind, topic: string): string {
  return TOWER_SUPPORT_REQUEST_CONFIG[kind].topics.find((option) => option.value === topic)?.label ?? topic;
}

function statusBadgeVariant(status: SupportRequestRow["status"]): "default" | "secondary" | "outline" {
  if (status === "pending") {
    return "default";
  }
  if (status === "resolved") {
    return "secondary";
  }
  return "outline";
}

export function OperatorSupportRequests() {
  const [rows, setRows] = useState<SupportRequestRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [operatorNote, setOperatorNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await operatorApi.listSupportRequests({ status: statusFilter, kind: kindFilter });
      setRows(res.rows);
    } catch (err) {
      setError(err instanceof OperatorApiError ? err.message : "Could not load support requests");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, kindFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onResolveOrDismiss() {
    if (!pendingAction) {
      return;
    }
    setBusyId(pendingAction.id);
    try {
      await operatorApi.resolveSupportRequest(pendingAction.id, pendingAction.action, operatorNote.trim() || null);
      toast.success(pendingAction.action === "resolve" ? "Request resolved" : "Request dismissed");
      setPendingAction(null);
      setOperatorNote("");
      await load();
    } catch (err) {
      toast.error(err instanceof OperatorApiError ? err.message : "Could not update request");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Operator</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Support requests</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Feedback and help submissions from Tower. Resolve when handled, or dismiss to archive without action.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
          <SelectTrigger aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
            <SelectItem value="all">All statuses</SelectItem>
          </SelectContent>
        </Select>
        <Select value={kindFilter} onValueChange={(value) => setKindFilter(value as KindFilter)}>
          <SelectTrigger aria-label="Filter by kind">
            <SelectValue placeholder="Kind" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All kinds</SelectItem>
            <SelectItem value="feedback">Feedback</SelectItem>
            <SelectItem value="help">Help</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kind</TableHead>
              <TableHead>Topic</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? SUPPORT_REQUEST_SKELETON_ROWS.map((rowKey) => (
                  <TableRow key={`sk-row-${rowKey}`}>
                    {SUPPORT_REQUEST_SKELETON_COLS.map((colKey) => (
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
                  No support requests match these filters.
                </TableCell>
              </TableRow>
            ) : null}
            {!loading
              ? rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {row.kind === "feedback" ? (
                          <IconMessageCircle className="size-4 text-muted-foreground" aria-hidden />
                        ) : (
                          <IconLifebuoy className="size-4 text-muted-foreground" aria-hidden />
                        )}
                        <span>{kindLabel(row.kind)}</span>
                      </div>
                    </TableCell>
                    <TableCell>{topicLabel(row.kind, row.topic)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <IconMail className="size-4 text-muted-foreground" aria-hidden />
                        <span className="font-medium">{row.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="line-clamp-3 text-muted-foreground">{row.details}</p>
                      {row.operatorNote ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Note: <span className="text-foreground">{row.operatorNote}</span>
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(row.status)}>{row.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{formatRelative(row.createdAt)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {row.status === "pending" ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="gap-1.5"
                            disabled={busyId === row.id}
                            onClick={() => {
                              setOperatorNote("");
                              setPendingAction({ id: row.id, action: "resolve" });
                            }}
                          >
                            <IconCheck className="size-3.5" />
                            Resolve
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            disabled={busyId === row.id}
                            onClick={() => {
                              setOperatorNote("");
                              setPendingAction({ id: row.id, action: "dismiss" });
                            }}
                          >
                            <IconX className="size-3.5" />
                            Dismiss
                          </Button>
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

      <Dialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingAction(null);
            setOperatorNote("");
          }
        }}
      >
        <DialogContent size="form">
          <DialogHeader>
            <DialogTitle>{pendingAction?.action === "dismiss" ? "Dismiss request" : "Resolve request"}</DialogTitle>
            <DialogDescription>
              {pendingAction?.action === "dismiss"
                ? "Archive this request without marking it handled."
                : "Mark this request as handled. Add an internal note if helpful."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="support-request-operator-note">Operator note (optional)</Label>
            <Textarea
              id="support-request-operator-note"
              fieldSize="lg"
              placeholder="Internal note for your team"
              value={operatorNote}
              onChange={(event) => setOperatorNote(event.target.value)}
            />
          </div>
          <DialogFooter showCloseButton>
            <Button type="button" disabled={busyId !== null} onClick={() => void onResolveOrDismiss()}>
              {pendingAction?.action === "dismiss" ? "Dismiss" : "Resolve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
