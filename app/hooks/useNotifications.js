"use client";

import { useState } from "react";

export function useNotifications() {
  // TODO: replace with the real notification data source (e.g. useSWR("/api/notifications"))
  const [count] = useState(2);
  return { count, hasUnread: count > 0 };
}