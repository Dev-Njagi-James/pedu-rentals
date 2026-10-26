const KNOWN_ROLES = ["admin", "lister", "user"];

export const normalizeRole = (r) => (KNOWN_ROLES.includes(r) ? r : "user");

export function homeForRole(role) {
  switch (normalizeRole(role)) {
    case "admin":
      return "/Admin";
    case "lister":
      return "/Lister";
    default:
      return "/";
  }
}
