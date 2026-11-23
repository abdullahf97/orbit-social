"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  Heart,
  MessageCircle,
  UserPlus,
} from "lucide-react";
import {
  useMarkNotificationsRead,
  useNotifications,
} from "@/features/api/hooks";
import { useSession } from "@/features/auth/session";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/feedback";
import { Spinner } from "@/components/ui/spinner";
import { useInView } from "@/lib/use-in-view";
import { cn, timeAgo } from "@/lib/utils";
import type { NotificationDto } from "@/lib/schemas";

function groupLabel(date: string): string {
  const value = new Date(date);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  if (value >= startOfToday) return "Today";
  if (value >= startOfWeek) return "This week";
  return "Earlier";
}

function NotificationIcon({ type }: { type: NotificationDto["type"] }) {
  if (type === "LIKE") {
    return (
      <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-accent text-accent-ink ring-2 ring-surface">
        <Heart className="size-2.5 fill-current" />
      </span>
    );
  }
  if (type === "COMMENT") {
    return (
      <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-sky-500 text-white ring-2 ring-surface">
        <MessageCircle className="size-2.5 fill-current" />
      </span>
    );
  }
  return (
    <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-emerald-500 text-white ring-2 ring-surface">
      <UserPlus className="size-2.5" />
    </span>
  );
}

function NotificationRow({
  notification,
  onRead,
}: {
  notification: NotificationDto;
  onRead: (id: string) => void;
}) {
  const href =
    notification.type === "FOLLOW" || !notification.post
      ? `/u/${notification.actor.username}`
      : `/p/${notification.post.id}`;

  const text =
    notification.type === "LIKE"
      ? "liked your post"
      : notification.type === "COMMENT"
        ? "commented on your post"
        : "started following you";

  return (
    <li>
      <Link
        href={href}
        onClick={() => {
          if (!notification.readAt) onRead(notification.id);
        }}
        className={cn(
          "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2/70",
          !notification.readAt && "bg-accent/[0.045]",
        )}
      >
        <span className="relative shrink-0">
          <Avatar user={notification.actor} size={44} />
          <NotificationIcon type={notification.type} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] leading-snug text-text">
            <span className="font-semibold">{notification.actor.name}</span>{" "}
            <span className="text-muted">{text}</span>
            <span className="ml-1.5 text-[11.5px] text-dim">
              {timeAgo(notification.createdAt)}
            </span>
          </p>
          {notification.type === "COMMENT" && notification.preview ? (
            <p className="mt-0.5 line-clamp-1 text-[12.5px] text-muted">
              “{notification.preview}”
            </p>
          ) : null}
        </div>

        {notification.post?.imageUrl ? (
          <img
            src={notification.post.imageUrl}
            alt=""
            className="size-11 shrink-0 rounded-lg object-cover"
            loading="lazy"
          />
        ) : null}

        {!notification.readAt ? (
          <span
            aria-label="Unread"
            className="size-2 shrink-0 rounded-full bg-accent"
          />
        ) : null}
      </Link>
    </li>
  );
}

export default function NotificationsPage() {
  const { unread } = useSession();
  const notifications = useNotifications();
  const markRead = useMarkNotificationsRead();
  const [sentinelRef, inView] = useInView<HTMLDivElement>({
    rootMargin: "500px 0px",
  });

  const items = useMemo(
    () => notifications.data?.pages.flatMap((page) => page.items) ?? [],
    [notifications.data],
  );

  useEffect(() => {
    if (
      inView &&
      notifications.hasNextPage &&
      !notifications.isFetchingNextPage
    ) {
      void notifications.fetchNextPage();
    }
  }, [inView, notifications]);

  const grouped = useMemo(() => {
    const map = new Map<string, NotificationDto[]>();
    for (const item of items) {
      const key = groupLabel(item.createdAt);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [items]);

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-dim">
            Inbox
          </p>
          <h1 className="mt-1 font-display text-[34px] leading-none tracking-tight text-text sm:text-[40px]">
            Notifications
          </h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={unread === 0 || markRead.isPending}
          onClick={() => markRead.mutate({ all: true })}
        >
          <CheckCheck className="size-4" />
          Mark all read
        </Button>
      </header>

      {notifications.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4"
            >
              <Skeleton className="size-11 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-2.5 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Bell className="size-5" />}
          title="No notifications yet"
          description="Likes, comments and new followers will land here."
        />
      ) : (
        <div className="space-y-6">
          {grouped.map(([label, rows]) => (
            <section key={label}>
              <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-dim">
                {label}
              </h2>
              <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                {rows.map((notification) => (
                  <NotificationRow
                    key={notification.id}
                    notification={notification}
                    onRead={(id) => markRead.mutate({ ids: [id] })}
                  />
                ))}
              </ul>
            </section>
          ))}

          <div ref={sentinelRef} className="h-px" />
          {notifications.isFetchingNextPage ? (
            <div className="flex justify-center py-4">
              <Spinner className="size-5 text-muted" />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
