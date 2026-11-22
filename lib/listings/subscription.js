export function hasActiveSub(subs) {
  if (!Array.isArray(subs)) return false;
  const now = new Date();
  return subs.some(
    (s) => s.status === "active" && s.expires_at && new Date(s.expires_at) > now,
  );
}
