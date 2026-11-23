"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Camera, ImagePlus, Share2 } from "lucide-react";
import { toast } from "sonner";
import {
  useProfile,
  useUpdateProfile,
  useUserPosts,
  uploadImage,
} from "@/features/api/hooks";
import { useSession } from "@/features/auth/session";
import { FollowButton } from "@/features/users/follow-button";
import { PostGrid } from "@/features/feed/post-grid";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/feedback";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { useInView } from "@/lib/use-in-view";
import { formatCount } from "@/lib/utils";
import { prepareImage, validateImageFile } from "@/lib/image";

function EditProfileModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user, patchUser } = useSession();
  const update = useUpdateProfile();
  const [name, setName] = useState(user?.name ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !user) return;
    setName(user.name);
    setBio(user.bio ?? "");
    setAvatarFile(null);
  }, [open, user]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  async function save() {
    if (!user) return;
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
      onClose();
    } catch {
      // the mutation already surfaced a toast
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit profile"
      description="This is how you appear across Orbit."
    >
      <div className="space-y-4 px-5 py-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="group relative rounded-full"
            aria-label="Change profile photo"
          >
            <Avatar
              user={{
                username: user?.username ?? "orbit",
                name: name || "Orbit",
                avatarUrl: avatarPreview ?? user?.avatarUrl ?? null,
              }}
              size={76}
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
              <ImagePlus className="size-4" />
              Change photo
            </Button>
            <p className="mt-1.5 text-[11.5px] text-dim">
              Square images look best. Max 4 MB.
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
            placeholder="A line about what you're into."
            className="w-full resize-none rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-[14px] text-text placeholder:text-dim focus:border-accent/70 focus:outline-none focus:ring-4 focus:ring-accent/10"
          />
        </label>
      </div>

      <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button loading={saving} onClick={() => void save()}>
          Save changes
        </Button>
      </div>
    </Modal>
  );
}

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const username = params.username ?? "";

  const profile = useProfile(username);
  const posts = useUserPosts(username);
  const [sentinelRef, inView] = useInView<HTMLDivElement>({
    rootMargin: "500px 0px",
  });
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (inView && posts.hasNextPage && !posts.isFetchingNextPage) {
      void posts.fetchNextPage();
    }
  }, [inView, posts]);

  if (profile.isPending) {
    return (
      <div className="space-y-5">
        <div className="rounded-3xl border border-line bg-surface p-5">
          <div className="flex gap-5">
            <Skeleton className="size-[86px] rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (profile.isError || !profile.data) {
    return (
      <EmptyState
        title="Profile not found"
        description="That username isn't in orbit. It may have been changed."
        action={
          <Link href="/explore">
            <Button size="sm" variant="outline">
              Explore people
            </Button>
          </Link>
        }
      />
    );
  }

  const { user, isMe, isFollowing, followsMe } = profile.data;
  const allPosts = posts.data?.pages.flatMap((page) => page.items) ?? [];

  async function shareProfile() {
    const url = `${window.location.origin}/u/${user.username}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${user.name} on Orbit`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Profile link copied");
    } catch {
      // dismissed
    }
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-3xl border border-line bg-surface">
        <div className="h-20 bg-[radial-gradient(circle_at_20%_20%,var(--accent)_0%,transparent_45%),radial-gradient(circle_at_80%_0%,#7c6cff_0%,transparent_40%)] opacity-30" />
        <div className="px-5 pb-5">
          <div className="-mt-10 flex items-end justify-between gap-3">
            <Avatar user={user} size={86} className="ring-4 ring-surface" />
            <div className="mb-1 flex items-center gap-2">
              {isMe ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(true)}
                >
                  Edit profile
                </Button>
              ) : (
                <FollowButton
                  username={user.username}
                  isFollowing={isFollowing}
                  followsMe={followsMe}
                />
              )}
              <Button
                variant="ghost"
                size="icon"
                aria-label="Share profile"
                onClick={() => void shareProfile()}
              >
                <Share2 className="size-4" />
              </Button>
            </div>
          </div>

          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-[30px] leading-none tracking-tight text-text">
                {user.name}
              </h1>
              {followsMe && !isMe ? (
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10.5px] font-medium text-muted">
                  Follows you
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-[13px] text-muted">@{user.username}</p>
            {user.bio ? (
              <p className="mt-3 max-w-lg whitespace-pre-wrap text-[13.5px] leading-relaxed text-text/90">
                {user.bio}
              </p>
            ) : null}
          </div>

          <dl className="mt-4 flex gap-6 text-[13px]">
            <div className="flex items-baseline gap-1.5">
              <dt className="sr-only">Posts</dt>
              <dd>
                <span className="font-semibold text-text">
                  {formatCount(user.postCount)}
                </span>{" "}
                <span className="text-muted">posts</span>
              </dd>
            </div>
            <div className="flex items-baseline gap-1.5">
              <dt className="sr-only">Followers</dt>
              <dd>
                <span className="font-semibold text-text">
                  {formatCount(user.followerCount)}
                </span>{" "}
                <span className="text-muted">followers</span>
              </dd>
            </div>
            <div className="flex items-baseline gap-1.5">
              <dt className="sr-only">Following</dt>
              <dd>
                <span className="font-semibold text-text">
                  {formatCount(user.followingCount)}
                </span>{" "}
                <span className="text-muted">following</span>
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-dim">
          Posts
        </h2>

        {posts.isPending ? (
          <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : allPosts.length === 0 ? (
          <EmptyState
            title={isMe ? "You haven't posted yet" : "No posts yet"}
            description={
              isMe
                ? "Your first post is one tap away."
                : "When they share something, it shows up here."
            }
          />
        ) : (
          <>
            <PostGrid posts={allPosts} />
            <div ref={sentinelRef} className="h-px" />
            {posts.isFetchingNextPage ? (
              <div className="flex justify-center py-5">
                <Spinner className="size-5 text-muted" />
              </div>
            ) : null}
          </>
        )}
      </section>

      {isMe ? (
        <EditProfileModal open={editing} onClose={() => setEditing(false)} />
      ) : null}
    </div>
  );
}
