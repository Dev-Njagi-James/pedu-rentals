import { useUser } from "@clerk/nextjs";
import { normalizeRole } from "@/lib/auth/routes";

export function useIsAdmin() {
  const { isLoaded, user } = useUser();
  return {
    isLoaded,
    isAdmin: isLoaded && normalizeRole(user?.publicMetadata?.role) === "admin",
  };
}
