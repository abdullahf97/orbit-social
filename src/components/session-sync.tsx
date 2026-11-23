"use client";

import { useEffect } from "react";
import { useSession } from "@/features/auth/session";
import { useUnreadCount } from "@/features/api/hooks";

/**
 * Keeps the session's unread counter in sync with the polled query so the
 * badge is rendered from one source of truth.
 */
export function SessionSync() {
  const { data } = useUnreadCount();
  const { setUnread } = useSession();

  useEffect(() => {
    if (typeof data?.count === "number") setUnread(data.count);
  }, [data?.count, setUnread]);

  return null;
}
