export type MemberRow = {
  id: string;
  userId: string;
  role: string;
  user: { id: string; name: string; email: string };
};

export type InvitationRow = {
  id: string;
  email: string;
  role: string | null;
  status: string;
  expiresAt?: string | Date | null;
};
