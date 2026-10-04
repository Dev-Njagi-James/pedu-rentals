export function homeForRole(role) {
  if (role === "admin") return "/Admin";
  if (role === "lister") return "/Lister";
  return "/"; // viewers. Confirm this is the properties listing page.
}
