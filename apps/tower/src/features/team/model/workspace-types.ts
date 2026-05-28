export type MemberRow = {
  id: string;
  userId: string;
  role: string;
  user: { id: string; name: string; email: string };
};

export type MemberDepartureRow = {
  id: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  role: string;
  departedAt: string;
};

export type InvitationRow = {
  id: string;
  email: string;
  role: string | null;
  status: string;
  expiresAt?: string | Date | null;
};

export type WorkspaceOrgSummary = {
  id: string;
  name: string;
  slug: string;
  seatLimit?: number | null;
  ownerUserId?: string | null;
};
