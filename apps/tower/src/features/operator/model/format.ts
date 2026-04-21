export function initialsFor(nameOrEmail: string | null | undefined): string {
  if (!nameOrEmail) {
    return "·";
  }
  const trimmed = nameOrEmail.trim();
  if (!trimmed) {
    return "·";
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length > 1 && parts[0] && parts[1]) {
    return (parts[0][0] ?? "").concat(parts[1][0] ?? "").toUpperCase();
  }
  const email = trimmed;
  const [local] = email.split("@");
  return (local ?? "·").slice(0, 2).toUpperCase();
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "—";
  }
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "—";
  }
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return "—";
  }
  const diffMs = Date.now() - then;
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) {
    return "just now";
  }
  const min = Math.floor(sec / 60);
  if (min < 60) {
    return `${min}m ago`;
  }
  const hr = Math.floor(min / 60);
  if (hr < 24) {
    return `${hr}h ago`;
  }
  const day = Math.floor(hr / 24);
  if (day < 30) {
    return `${day}d ago`;
  }
  const mo = Math.floor(day / 30);
  if (mo < 12) {
    return `${mo}mo ago`;
  }
  const yr = Math.floor(day / 365);
  return `${yr}y ago`;
}

export function appRoleLabel(role: string | null | undefined): string {
  if (role === "product_admin") {
    return "Operator";
  }
  return "User";
}

export function appRoleTone(role: string | null | undefined): "operator" | "user" {
  return role === "product_admin" ? "operator" : "user";
}

export function userAgentSummary(ua: string | null | undefined): string {
  if (!ua) {
    return "Unknown device";
  }
  const s = ua.toLowerCase();
  let platform = "Unknown";
  if (/(iphone|ipad|ipod)/.test(s)) {
    platform = "iOS";
  } else if (/android/.test(s)) {
    platform = "Android";
  } else if (/mac os x|macintosh/.test(s)) {
    platform = "macOS";
  } else if (/windows/.test(s)) {
    platform = "Windows";
  } else if (/linux/.test(s)) {
    platform = "Linux";
  }
  let browser = "Browser";
  if (/edg\//.test(s)) {
    browser = "Edge";
  } else if (/chrome\//.test(s) && !/edg\//.test(s)) {
    browser = "Chrome";
  } else if (/firefox\//.test(s)) {
    browser = "Firefox";
  } else if (/safari\//.test(s) && !/chrome\//.test(s)) {
    browser = "Safari";
  }
  return `${browser} · ${platform}`;
}
