"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, errorMessage } from "@/features/api/client";
import { Button } from "@/components/ui/button";

export function DemoLoginButton({
  size = "lg",
  variant = "primary",
  label = "Explore the demo",
}: {
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "outline" | "secondary";
  label?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function enter() {
    setPending(true);
    try {
      await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          identifier: "nova@orbit.app",
          password: "orbitdemo",
        }),
        skipAuthRedirect: true,
      });
      router.push("/feed");
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
      setPending(false);
    }
  }

  return (
    <Button
      size={size}
      variant={variant}
      loading={pending}
      onClick={() => void enter()}
    >
      {label}
      <ArrowRight className="size-4" />
    </Button>
  );
}
