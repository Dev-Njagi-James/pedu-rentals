export function canViewContact(caller, listing) {
  if (!caller?.userId) return false;
  if (caller.role === "admin") return true;
  if (listing?.lister_uuid === caller.userId) return true;
  return caller.hasAccess === true;
}
