/** Reject protocol-relative and other unsafe same-app redirect targets. */
export function sanitizeRelativePath(pathname: string, search = ""): string {
  const pathWithQuery = `${pathname}${search}`;
  if (!pathWithQuery.startsWith("/") || pathWithQuery.startsWith("//")) {
    return "/";
  }
  return pathWithQuery;
}
