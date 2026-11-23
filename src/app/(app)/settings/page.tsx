"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Camera,
  Database,
  HardDriveDownload,
  LogOut,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useUpdateProfile, uploadImage } from "@/features/api/hooks";
import { useSession } from "@/features/auth/session";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { GithubIcon } from "@/components/ui/github-icon";
import { prepareImage, validateImageFile } from "@/lib/image";

async function clearOfflineData() {
  try {
    localStorage.removeItem("orbit-composer-draft");
  } catch {
    // ignore
  }

  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase("orbit");
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });

  window.location.reload();
}

export default function SettingsPage() {
  const { user, patchUser, logout } = useSession();
  const update = useUpdateProfile();

  const [name, setName] = useState(user?.name ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!avatarFile) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  if (!user) return null;

  async function saveProfile() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Your name can't be empty.");
      return;
    }

    setSaving(true);
    try {
      let avatarUrl: string | undefined;
      if (avatarFile) {
        const uploaded = await uploadImage(await prepareImage(avatarFile), "avatar");
        avatarUrl = uploaded.url;
      }

      await update.mutateAsync({
        name: trimmed,
        bio: bio.trim() || null,
        ...(avatarUrl ? { avatarUrl } : {}),
      });
      patchUser({ name: trimmed, bio: bio.trim() || null });
      setAvatarFile(null);
    } catch {
      // toast handled by the mutation
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-dim">
          Account
        </p>
        <h1 className="mt-1 font-display text-[34px] leading-none tracking-tight text-text sm:text-[40px]">
          Settings
        </h1>
      </header>

      <section className="rounded-3xl border border-line bg-surface p-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-dim">
          Profile
        </h2>

        <div className="mt-4 flex items-center gap-4">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="group relative rounded-full"
            aria-label="Change profile photo"
          >
            <Avatar
              user={{
                username: user.username,
                name: name || user.name,
                avatarUrl: preview ?? user.avatarUrl,
              }}
              size={72}
            />
            <span className="absolute inset-0 grid place-items-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="size-5" />
            </span>
          </button>
          <div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              Change photo
            </Button>
            <p className="mt-1.5 text-[11.5px] text-dim">
              JPEG, PNG, WebP or AVIF · max 4 MB
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                const error = validateImageFile(file);
                if (error) {
                  toast.error(error);
                  return;
                }
                setAvatarFile(file);
              }}
            />
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <label className="block space-y-1.5">
            <span className="text-[13px] font-medium text-muted">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value.slice(0, 50))}
              className="h-11 w-full rounded-xl border border-line bg-surface-2 px-3.5 text-[15px] text-text focus:border-accent/70 focus:outline-none focus:ring-4 focus:ring-accent/10"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="flex items-baseline justify-between text-[13px] font-medium text-muted">
              Bio
              <span className="text-[11px] text-dim">{bio.length}/160</span>
            </span>
            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value.slice(0, 160))}
              rows={3}
              className="w-full resize-none rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-[14px] text-text focus:border-accent/70 focus:outline-none focus:ring-4 focus:ring-accent/10"
            />
          </label>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-2/50 px-3.5 py-3">
            <div>
              <p className="text-[13px] font-medium text-text">Username</p>
              <p className="text-[12px] text-muted">@{user.username}</p>
            </div>
            <span className="text-[11px] text-dim">permanent</span>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-2/50 px-3.5 py-3">
            <div>
              <p className="text-[13px] font-medium text-text">Email</p>
              <p className="text-[12px] text-muted">{user.email}</p>
            </div>
            <ShieldCheck className="size-4 text-success" />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button loading={saving} onClick={() => void saveProfile()}>
            Save changes
          </Button>
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-surface p-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-dim">
          Appearance
        </h2>
        <div className="mt-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-[13.5px] font-medium text-text">Theme</p>
            <p className="text-[12px] text-muted">
              Dark or light — stored on this device, applied before paint.
            </p>
          </div>
          <ThemeToggle />
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-surface p-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-dim">
          Offline data
        </h2>
        <div className="mt-3 flex items-start gap-3">
          <HardDriveDownload className="mt-0.5 size-4 shrink-0 text-muted" />
          <div className="flex-1">
            <p className="text-[13.5px] font-medium text-text">
              Your feed lives in IndexedDB
            </p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">
              Feed pages, likes, comments and pending actions are cached locally
              so Orbit keeps working on a flaky connection. Clearing this also
              drops anything still queued.
            </p>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (
                window.confirm(
                  "Clear the offline cache? Pending likes and comments will be lost.",
                )
              ) {
                void clearOfflineData();
              }
            }}
          >
            <Trash2 className="size-3.5" />
            Clear offline cache
          </Button>
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-surface p-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-dim">
          Session
        </h2>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[12.5px] text-muted">
            <Database className="size-3.5" />
            Signed in as @{user.username}
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => void logout()}
          >
            <LogOut className="size-3.5" />
            Sign out
          </Button>
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-surface p-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-dim">
          About this build
        </h2>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
          Orbit is a portfolio project: Next.js App Router, PostgreSQL via Prisma,
          cursor-paginated feed, optimistic mutations, IndexedDB persistence and a
          service worker for the app shell.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/about"
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 py-1.5 text-[12px] font-medium text-text hover:border-line-strong"
          >
            Architecture
          </Link>
          <a
            href="https://github.com/abdullahf97/orbit-social"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 py-1.5 text-[12px] font-medium text-text hover:border-line-strong"
          >
            <GithubIcon className="size-3.5" />
            GitHub
          </a>
        </div>
      </section>
    </div>
  );
}
