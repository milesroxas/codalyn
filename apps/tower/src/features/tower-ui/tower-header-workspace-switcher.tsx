"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/features/auth/model/auth-client";
import { TeamWorkspaceSwitcher } from "@/features/team/ui/team-workspace-switcher";
import { isProductAdminAppRole } from "@/shared/lib/membership/product-admin-role";

function slugify(name: string): string {
  const s = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return s.length > 0 ? s : "team";
}

type SessionUserWithPreferred = {
  preferredOrganizationId?: string | null;
};

function pickAutoWorkspaceId(orgList: { id: string }[], preferred: string | null): string | undefined {
  if (orgList.length === 0) {
    return undefined;
  }
  if (orgList.length === 1) {
    return orgList[0].id;
  }
  if (preferred && orgList.some((o) => o.id === preferred)) {
    return preferred;
  }
  return orgList[0].id;
}

export function TowerHeaderWorkspaceSwitcher() {
  const { data: session, isPending: sessionPending, refetch: refetchSession } = authClient.useSession();
  const { data: orgs, isPending: orgsPending, refetch: refetchOrgs } = authClient.useListOrganizations();
  const {
    data: activeOrg,
    isPending: activeOrgPending,
    refetch: refetchActiveOrg,
  } = authClient.useActiveOrganization();

  const [orgName, setOrgName] = useState("");
  const [busy, setBusy] = useState(false);
  const autoWorkspaceAttemptedRef = useRef(false);
  const lastAutoWorkspaceUserIdRef = useRef<string | undefined>(undefined);

  const refreshTeam = useCallback(async () => {
    await Promise.all([refetchOrgs(), refetchActiveOrg()]);
  }, [refetchOrgs, refetchActiveOrg]);

  const preferredOrgId = (session?.user as SessionUserWithPreferred | undefined)?.preferredOrganizationId ?? undefined;

  const isProductAdmin = isProductAdminAppRole(session?.user?.role);
  const canCreateTeam =
    isProductAdmin ||
    Boolean((session?.user as { canCreateOrganization?: boolean } | undefined)?.canCreateOrganization);

  useEffect(() => {
    const uid = session?.user?.id;
    if (lastAutoWorkspaceUserIdRef.current !== uid) {
      lastAutoWorkspaceUserIdRef.current = uid;
      autoWorkspaceAttemptedRef.current = false;
    }
    if (sessionPending || orgsPending || activeOrgPending || !uid || !session?.user) {
      return;
    }
    if (activeOrg) {
      return;
    }
    const orgList = orgs ?? [];
    if (orgList.length === 0 || autoWorkspaceAttemptedRef.current) {
      return;
    }
    autoWorkspaceAttemptedRef.current = true;

    const preferred = (session.user as SessionUserWithPreferred).preferredOrganizationId ?? null;
    const pick = pickAutoWorkspaceId(orgList, preferred);
    if (!pick) {
      autoWorkspaceAttemptedRef.current = false;
      return;
    }

    void (async () => {
      setBusy(true);
      const res = await authClient.organization.setActive({ organizationId: pick });
      setBusy(false);
      if (res.error) {
        const msg = res.error.message ?? "Could not select workspace";
        toast.error(msg);
        autoWorkspaceAttemptedRef.current = false;
        return;
      }
      await refreshTeam();
    })();
  }, [sessionPending, orgsPending, activeOrgPending, session?.user, orgs, activeOrg, refreshTeam]);

  const onCreateOrg = async (e: FormEvent): Promise<boolean> => {
    e.preventDefault();
    const name = orgName.trim();
    if (!name) {
      return false;
    }
    setBusy(true);
    const slug = slugify(name);
    const res = await authClient.organization.create({
      name,
      slug,
    });
    setBusy(false);
    if (res.error) {
      toast.error(res.error.message ?? "Could not create team");
      return false;
    }
    setOrgName("");
    await refreshTeam();
    toast.success("Team created");
    return true;
  };

  const onSetActive = async (organizationId: string) => {
    setBusy(true);
    const res = await authClient.organization.setActive({ organizationId });
    setBusy(false);
    if (res.error) {
      toast.error(res.error.message ?? "Could not switch team");
      return;
    }
    await refreshTeam();
    toast.success("Workspace switched");
  };

  const onTogglePreferredWorkspace = (organizationId: string) => {
    const uid = session?.user?.id;
    if (!uid) {
      return;
    }
    const orgList = orgs ?? [];
    if (!orgList.some((o) => o.id === organizationId)) {
      return;
    }
    const current = (session?.user as SessionUserWithPreferred | undefined)?.preferredOrganizationId ?? null;
    const nextId = current === organizationId ? null : organizationId;

    void (async () => {
      setBusy(true);
      try {
        const res = await fetch("/api/account/preferred-workspace", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organizationId: nextId }),
          credentials: "include",
        });
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          const msg =
            body.error === "not_member"
              ? "You are not a member of that workspace."
              : "Could not update default workspace";
          toast.error(msg);
          return;
        }
        await refetchSession();
        if (nextId) {
          await onSetActive(organizationId);
        } else {
          toast.success("Default workspace cleared");
        }
      } finally {
        setBusy(false);
      }
    })();
  };

  const workspaceTriggerLabel = useMemo(() => {
    if (orgsPending) {
      return "Loading workspaces…";
    }
    const orgList = orgs ?? [];
    if (orgList.length === 0) {
      return "No workspace";
    }
    if (activeOrg?.name) {
      return activeOrg.name;
    }
    return "Select workspace";
  }, [orgsPending, orgs, activeOrg?.name]);

  if (sessionPending || !session?.user) {
    return null;
  }

  return (
    <TeamWorkspaceSwitcher
      orgs={orgs}
      orgsPending={orgsPending}
      activeOrgId={activeOrg?.id}
      triggerLabel={workspaceTriggerLabel}
      busy={busy}
      compact
      canCreateTeam={canCreateTeam}
      orgName={orgName}
      onOrgNameChange={setOrgName}
      onCreateOrg={onCreateOrg}
      onSetActive={onSetActive}
      preferredOrgId={preferredOrgId}
      onTogglePreferredWorkspace={onTogglePreferredWorkspace}
    />
  );
}
