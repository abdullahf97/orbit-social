import Link from "next/link";
import { Compass } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-md text-center">
        <Logo className="justify-center" />
        <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.18em] text-dim">
          404
        </p>
        <h1 className="mt-2 font-display text-[40px] leading-none tracking-tight text-text">
          Lost in orbit
        </h1>
        <p className="mt-3 text-[13.5px] leading-relaxed text-muted">
          That page doesn’t exist — or it drifted out of range.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/feed">
            <Button>
              <Compass className="size-4" />
              Back to the feed
            </Button>
          </Link>
          <Link href="/">
            <Button variant="ghost">Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
