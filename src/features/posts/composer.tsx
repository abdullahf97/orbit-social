"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import {
  useCreatePost,
  useOnline,
  uploadImage,
} from "@/features/api/hooks";
import { useSession } from "@/features/auth/session";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { prepareImage, validateImageFile } from "@/lib/image";
import { createClientId } from "@/lib/utils";

const DRAFT_KEY = "orbit-composer-draft";
const MAX_CAPTION = 2200;

export function Composer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useSession();
  const online = useOnline();
  const createPost = useCreatePost();

  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as { caption?: string };
        if (draft.caption) setCaption((current) => current || draft.caption || "");
      }
    } catch {
      // corrupt draft — ignore
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      try {
        if (caption.trim()) {
          localStorage.setItem(
            DRAFT_KEY,
            JSON.stringify({ caption, savedAt: Date.now() }),
          );
        } else {
          localStorage.removeItem(DRAFT_KEY);
        }
      } catch {
        // storage full / private mode
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [caption, open]);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function reset() {
    setCaption("");
    setFile(null);
    setUploading(false);
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
  }

  function close() {
    onClose();
    // Keep the draft, drop the image (object URLs do not survive a reload).
    setFile(null);
  }

  function pickFile(next: File | null) {
    if (!next) return;
    const error = validateImageFile(next);
    if (error) {
      toast.error(error);
      return;
    }
    setFile(next);
  }

  async function submit() {
    if (!user) return;
    const text = caption.trim();
    if (!text && !file) {
      toast.error("Add a caption or a photo first.");
      return;
    }

    if (file && !online) {
      toast.error("Photos need a connection. Your caption is saved as a draft.");
      return;
    }

    const clientId = createClientId();
    let image:
      | { url: string; width: number; height: number }
      | undefined;

    try {
      if (file) {
        setUploading(true);
        const prepared = await prepareImage(file);
        const uploaded = await uploadImage(prepared, "post");
        image = {
          url: uploaded.url,
          width: uploaded.width,
          height: uploaded.height,
        };
      }
    } catch (error) {
      setUploading(false);
      toast.error(
        error instanceof Error ? error.message : "Upload failed. Try another image.",
      );
      return;
    }

    setUploading(false);
    reset();
    onClose();

    createPost.mutate({
      clientId,
      caption: text,
      imageUrl: image?.url ?? null,
      imageWidth: image?.width,
      imageHeight: image?.height,
    });

    if (!online) {
      toast("Queued — your post goes out when you're back online.");
    }
  }

  // A paused mutation is still "pending"; offline we want to allow queueing
  // more than one post rather than locking the composer until reconnect.
  const busy = uploading || (createPost.isPending && online);

  return (
    <Modal
      open={open}
      onClose={close}
      title="New post"
      description="Share a moment with your orbit."
      className="sm:max-w-xl"
    >
      <div className="space-y-4 px-5 py-4">
        <div className="flex gap-3">
          {user ? <Avatar user={user} size={38} ring /> : null}
          <textarea
            value={caption}
            onChange={(event) => setCaption(event.target.value.slice(0, MAX_CAPTION))}
            placeholder="What's happening in your orbit?"
            aria-label="Post caption"
            rows={4}
            className="min-h-24 flex-1 resize-none bg-transparent text-[15px] leading-relaxed text-text placeholder:text-dim focus:outline-none"
          />
        </div>

        {preview ? (
          <div className="relative overflow-hidden rounded-2xl border border-line bg-surface-2">
            <img
              src={preview}
              alt="Selected preview"
              className="max-h-[320px] w-full object-contain"
            />
            <button
              type="button"
              onClick={() => setFile(null)}
              aria-label="Remove image"
              className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : null}

        {!online ? (
          <p className="rounded-xl border border-accent/25 bg-accent/5 px-3 py-2 text-[12.5px] text-accent">
            You’re offline. Text-only posts and comments are queued and sent
            automatically. Photos need a connection.
          </p>
        ) : null}

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const dropped = event.dataTransfer.files?.[0];
            if (dropped) pickFile(dropped);
          }}
          className={`rounded-xl border border-dashed px-3 py-2 text-center text-[12px] transition-colors ${
            dragging
              ? "border-accent bg-accent/5 text-accent"
              : "border-transparent text-dim"
          }`}
        >
          {dragging ? "Drop to attach" : "Drag a photo here, or use the button below"}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              className="hidden"
              onChange={(event) => {
                pickFile(event.target.files?.[0] ?? null);
                event.target.value = "";
              }}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              <ImagePlus className="size-4" />
              Photo
            </Button>
            <span
              className={`text-[11.5px] tabular-nums ${
                caption.length > MAX_CAPTION - 100 ? "text-accent" : "text-dim"
              }`}
            >
              {caption.length}/{MAX_CAPTION}
            </span>
          </div>

          <Button onClick={() => void submit()} disabled={busy}>
            {busy ? <Spinner className="size-4" /> : <Sparkles className="size-4" />}
            {uploading ? "Uploading…" : online ? "Share" : "Queue post"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function ComposerLauncher() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const openComposer = () => setOpen(true);
    window.addEventListener("orbit:compose", openComposer);
    return () => window.removeEventListener("orbit:compose", openComposer);
  }, []);

  return <Composer open={open} onClose={() => setOpen(false)} />;
}

export function openComposer() {
  window.dispatchEvent(new Event("orbit:compose"));
}
