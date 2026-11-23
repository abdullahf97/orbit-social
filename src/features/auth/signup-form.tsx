"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Eye, EyeOff, Loader2, X } from "lucide-react";
import { apiFetch, errorMessage } from "@/features/api/client";
import { HttpError, fieldError } from "@/lib/api-error";
import { signupSchema, usernameSchema } from "@/lib/schemas";
import { AuthShell } from "./auth-shell";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type FieldName = "name" | "username" | "email" | "password";
type Errors = Partial<Record<FieldName, string>>;

type UsernameState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "available" }
  | { status: "taken"; message: string; suggestions: string[] }
  | { status: "invalid"; message: string };

function passwordScore(password: string): number {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(4, score);
}

const STRENGTH = ["Too short", "Weak", "Okay", "Good", "Strong"];

export function SignupForm() {
  const router = useRouter();
  const [values, setValues] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [usernameState, setUsernameState] = useState<UsernameState>({
    status: "idle",
  });

  useEffect(() => {
    const raw = values.username.trim();
    if (!raw) {
      setUsernameState({ status: "idle" });
      return;
    }

    const local = usernameSchema.safeParse(raw);
    if (!local.success) {
      setUsernameState({
        status: "invalid",
        message: local.error.issues[0]?.message ?? "Invalid username.",
      });
      return;
    }

    setUsernameState({ status: "checking" });
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const data = await apiFetch<{
          available: boolean;
          reason: string | null;
          suggestions: string[];
        }>(
          `/api/auth/username-available?username=${encodeURIComponent(local.data)}`,
          { signal: controller.signal, skipAuthRedirect: true },
        );

        setUsernameState(
          data.available
            ? { status: "available" }
            : {
                status: "taken",
                message: data.reason ?? "That username is taken.",
                suggestions: data.suggestions,
              },
        );
      } catch {
        if (!controller.signal.aborted) setUsernameState({ status: "idle" });
      }
    }, 400);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [values.username]);

  function validateField(field: FieldName) {
    const result = signupSchema.shape[field].safeParse(values[field]);
    setErrors((previous) => ({
      ...previous,
      [field]: result.success ? undefined : result.error.issues[0]?.message,
    }));
  }

  async function submit() {
    const parsed = signupSchema.safeParse(values);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string") next[key as FieldName] = issue.message;
      }
      setErrors(next);
      return;
    }

    if (usernameState.status === "taken") {
      setErrors((previous) => ({
        ...previous,
        username: usernameState.message,
      }));
      return;
    }

    setFormError(null);
    setPending(true);
    try {
      await apiFetch("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(parsed.data),
        skipAuthRedirect: true,
      });
      router.replace("/feed");
      router.refresh();
    } catch (error) {
      if (error instanceof HttpError) {
        const usernameError = fieldError(error, "username");
        const emailError = fieldError(error, "email");
        if (usernameError || emailError) {
          setErrors((previous) => ({
            ...previous,
            ...(usernameError ? { username: usernameError } : {}),
            ...(emailError ? { email: emailError } : {}),
          }));
          setPending(false);
          return;
        }
      }
      setFormError(errorMessage(error));
      setPending(false);
    }
  }

  const score = passwordScore(values.password);

  return (
    <AuthShell
      title="Make some space"
      subtitle="A small account, a quiet feed, no algorithm deciding what you feel."
      footer={
        <p className="text-center text-[13px] text-muted">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-text underline decoration-accent/50 decoration-2 underline-offset-4 hover:decoration-accent"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
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

        <Field label="Name" htmlFor="name" error={errors.name}>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Nova Rahman"
            value={values.name}
            onChange={(event) => {
              setValues((previous) => ({ ...previous, name: event.target.value }));
              if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
            }}
            onBlur={() => validateField("name")}
            aria-invalid={Boolean(errors.name)}
          />
        </Field>

        <Field
          label="Username"
          htmlFor="username"
          error={errors.username}
          hint={
            usernameState.status === "checking" ? (
              <span className="inline-flex items-center gap-1 text-dim">
                <Loader2 className="size-3 animate-spin" /> checking
              </span>
            ) : usernameState.status === "available" ? (
              <span className="inline-flex items-center gap-1 text-success">
                <Check className="size-3" /> available
              </span>
            ) : usernameState.status === "taken" ? (
              <span className="inline-flex items-center gap-1 text-danger">
                <X className="size-3" /> taken
              </span>
            ) : undefined
          }
        >
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] text-dim">
              @
            </span>
            <Input
              id="username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="nova"
              value={values.username}
              onChange={(event) => {
                setValues((previous) => ({
                  ...previous,
                  username: event.target.value.toLowerCase().replace(/\s/g, ""),
                }));
                if (errors.username) setErrors((p) => ({ ...p, username: undefined }));
              }}
              onBlur={() => validateField("username")}
              aria-invalid={Boolean(errors.username)}
              className="pl-8"
            />
          </div>
          {usernameState.status === "taken" ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {usernameState.suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    setValues((previous) => ({
                      ...previous,
                      username: suggestion,
                    }));
                    setErrors((p) => ({ ...p, username: undefined }));
                  }}
                  className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[11.5px] text-muted transition-colors hover:border-accent/40 hover:text-text"
                >
                  @{suggestion}
                </button>
              ))}
            </div>
          ) : null}
        </Field>

        <Field label="Email" htmlFor="email" error={errors.email}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@example.com"
            value={values.email}
            onChange={(event) => {
              setValues((previous) => ({ ...previous, email: event.target.value }));
              if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
            }}
            onBlur={() => validateField("email")}
            aria-invalid={Boolean(errors.email)}
          />
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          error={errors.password}
          hint={
            values.password ? (
              <span
                className={cn(
                  score <= 1
                    ? "text-danger"
                    : score === 2
                      ? "text-accent"
                      : "text-success",
                )}
              >
                {STRENGTH[score]}
              </span>
            ) : undefined
          }
        >
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 8 characters"
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
          <div className="flex gap-1 pt-1" aria-hidden="true">
            {[0, 1, 2, 3].map((index) => (
              <span
                key={index}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  index < score
                    ? score <= 1
                      ? "bg-danger"
                      : score === 2
                        ? "bg-accent"
                        : "bg-success"
                    : "bg-line",
                )}
              />
            ))}
          </div>
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={pending}>
          Create account
          <ArrowRight className="size-4" />
        </Button>

        <p className="text-center text-[11px] leading-relaxed text-dim">
          By joining you agree to be kind to strangers and to the server.
        </p>
      </form>
    </AuthShell>
  );
}
