import { invalidateMyListingsCache } from "@/lib/cache/myListingsCache";
import { invalidateAdminCache } from "@/lib/cache/adminCache";
import { clearContactCache } from "@/lib/contact/fetchContact";
import { resetAccess } from "@/lib/contact/accessStore";

export function clearAllCaches() {
  invalidateMyListingsCache();
  invalidateAdminCache();
  clearContactCache();
  resetAccess();
  // Add listerProfileCache / analyticsCache clears here once they export one.
}
