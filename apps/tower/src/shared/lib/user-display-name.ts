export type UserDisplayNameFields = {
  email: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

export function userDisplayName(user: UserDisplayNameFields): string {
  const parts = [user.firstName?.trim(), user.lastName?.trim()].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(" ");
  }
  return user.name?.trim() || user.email;
}
