"use client";

import { useEffect, useState } from "react";
import { CloudOff, RefreshCw, WifiOff } from "lucide-react";
import { useOnline, usePendingMutationCount } from "@/features/api/hooks";
import { cn } from "@/lib/utils";

export function OfflineBanner() {
  const online = useOnline();
  const pending = usePendingMutationCount();
  const [wasOffline, setWasOffline] = useState(false);
  const [showSynced, setShowSynced] = useState(false);

  useEffect(() => {
    if (!online) {
      setWasOffline(true);
      setShowSynced(false);
      return;
    }

    if (wasOffline) {
      setShowSynced(true);
      const timer = window.setTimeout(() => setShowSynced(false), 2600);
      return () => window.clearTimeout(timer);
    }
  }, [online, wasOffline]);

  if (online && !showSynced && pending === 0) return null;

  const label = !online
    ? "Offline — showing your cached orbit"
    : showSynced
      ? "Back online — synced"
      : `${pending} ${pending === 1 ? "action" : "actions"} queued`;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-40 flex justify-center px-4">
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "pointer-events-auto flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium shadow-lg backdrop-blur-md",
          online
            ? "border-success/30 bg-success/10 text-success"
            : "border-accent/30 bg-accent/10 text-accent",
        )}
      >
        {!online ? (
          <WifiOff className="size-3.5" />
        ) : showSynced ? (
          <RefreshCw className="size-3.5" />
        ) : (
          <CloudOff className="size-3.5" />
        )}
        {label}
      </div>
    </div>
  );
}
