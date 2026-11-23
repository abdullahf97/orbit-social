"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Sparkles } from "lucide-react";
import { apiFetch, errorMessage } from "@/features/api/client";
import { loginSchema } from "@/lib/schemas";
import { AuthShell } from "./auth-shell";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type FieldName = "identifier" | "password";
type Errors = Partial<Record<FieldName, string>>;

const DEMO = { identifier: "nova@orbit.app", password: "orbitdemo" };

export function LoginForm({ expired }: { expired: boolean }) {
  const router = useRouter();
  const [values, setValues] = useState({ identifier: "", password: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(
    expired ? "Your session expired. Sign in again to pick up where you left off." : null,
  );
  const [pending, setPending] = useState(false);
  const [demoPending, setDemoPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function validateField(field: FieldName) {
    const result = loginSchema.shape[field].safeParse(values[field]);
    setErrors((previous) => ({
      ...previous,
      [field]: result.success ? undefined : result.error.issues[0]?.message,
    }));
  }

  async function login(input: { identifier: string; password: string }) {
    const parsed = loginSchema.safeParse(input);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === "identifier" || key === "password") next[key] = issue.message;
      }
      setErrors(next);
      return;
    }

    setFormError(null);
    setPending(true);
    try {
      await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(parsed.data),
        skipAuthRedirect: true,
      });
      router.replace("/feed");
      router.refresh();
    } catch (error) {
      setFormError(errorMessage(error));
      setPending(false);
    }
  }

  async function demoLogin() {
    setDemoPending(true);
    setValues(DEMO);
    await login(DEMO);
    setDemoPending(false);
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to see what your orbit has been up to."
      footer={
        <p className="text-center text-[13px] text-muted">
          New here?{" "}
          <Link
            href="/signup"
            className="font-medium text-text underline decoration-accent/50 decoration-2 underline-offset-4 hover:decoration-accent"
          >
            Create an account
          </Link>
        </p>
      }
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void login(values);
        }}
        className="space-y-4"
      >
        {formError ? (
          <div
            role="alert"
            className="rounded-xl border border-danger/25 bg-danger/5 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-danger"
          >
            {formError}
          </div>
        ) : null}

        <Field label="Username or email" htmlFor="identifier" error={errors.identifier}>
          <Input
            id="identifier"
            name="identifier"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="nova or nova@orbit.app"
            value={values.identifier}
            onChange={(event) => {
              setValues((previous) => ({
                ...previous,
                identifier: event.target.value,
              }));
              if (errors.identifier) setErrors((p) => ({ ...p, identifier: undefined }));
            }}
            onBlur={() => validateField("identifier")}
            aria-invalid={Boolean(errors.identifier)}
          />
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          error={errors.password}
          hint={
            <button
              type="button"
              className="text-[11.5px] text-dim hover:text-muted"
              onClick={() =>
                setFormError(
                  "Demo password is orbitdemo. The demo account is nova@orbit.app.",
                )
              }
            >
              Forgot?
            </button>
          }
        >
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={values.password}
              onChange={(event) => {
                setValues((previous) => ({
                  ...previous,
                  password: event.target.value,
                }));
                if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
              }}
              onBlur={() => validateField("password")}
              aria-invalid={Boolean(errors.password)}
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-surface hover:text-text"
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </Field>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={pending && !demoPending}
          disabled={demoPending}
        >
          Sign in
          <ArrowRight className="size-4" />
        </Button>

        <div className="flex items-center gap-3 py-1">
          <span className="h-px flex-1 bg-line" />
          <span className="text-[11px] uppercase tracking-wider text-dim">or</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <Button
          type="button"
          size="lg"
          variant="outline"
          className={cn("w-full")}
          loading={demoPending}
          disabled={pending}
          onClick={() => void demoLogin()}
        >
          <Sparkles className="size-4" />
          Explore the demo
        </Button>

        <p className="text-center text-[11.5px] leading-relaxed text-dim">
          Demo: <span className="text-muted">nova@orbit.app</span> ·{" "}
          <span className="text-muted">orbitdemo</span>
          <br />
          8 people, 20 posts and a full notification inbox.
        </p>
      </form>
    </AuthShell>
  );
}
