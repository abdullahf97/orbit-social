"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/features/api/client";
import type { CurrentUser, SessionResponse } from "@/lib/schemas";

type SessionValue = {
  user: CurrentUser | null;
  unread: number;
  setUnread: (value: number) => void;
  patchUser: (patch: Partial<CurrentUser>) => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({
  initialUser,
  initialUnread,
  children,
}: {
  initialUser: CurrentUser;
  initialUnread: number;
  children: ReactNode;
}) {
  const [user, setUser] = useState<CurrentUser | null>(initialUser);
  const [unread, setUnread] = useState(initialUnread);
  const router = useRouter();

  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null);
      router.replace("/login?expired=1");
    };
    window.addEventListener("orbit:unauthorized", onUnauthorized);
    return () => window.removeEventListener("orbit:unauthorized", onUnauthorized);
  }, [router]);

  const refresh = useCallback(async () => {
    const data = await apiFetch<SessionResponse>("/api/auth/session", {
      cache: "no-store",
      skipAuthRedirect: true,
    });
    setUser(data.user);
    setUnread(data.unreadNotifications);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      router.replace("/login");
      router.refresh();
    }
  }, [router]);

  const patchUser = useCallback((patch: Partial<CurrentUser>) => {
    setUser((previous) => (previous ? { ...previous, ...patch } : previous));
  }, []);

  const value = useMemo<SessionValue>(
    () => ({ user, unread, setUnread, patchUser, refresh, logout }),
    [user, unread, patchUser, refresh, logout],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used inside <SessionProvider>.");
  }
  return context;
}
