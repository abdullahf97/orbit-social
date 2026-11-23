"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-md text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-dim">
          Something broke
        </p>
        <h1 className="mt-2 font-display text-[38px] leading-none tracking-tight text-text">
          That orbit drifted
        </h1>
        <p className="mt-3 text-[13.5px] leading-relaxed text-muted">
          An unexpected error interrupted the page. Your cached feed is still on
          this device.
        </p>
        <Button className="mt-6" onClick={reset}>
          <RefreshCw className="size-4" />
          Try again
        </Button>
      </div>
    </div>
  );
}
