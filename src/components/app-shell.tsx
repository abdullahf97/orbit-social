"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Compass,
  Home,
  LogOut,
  Plus,
  Settings,
  User as UserIcon,
} from "lucide-react";
import { useSession } from "@/features/auth/session";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { OfflineBanner } from "@/components/offline-banner";
import { SessionSync } from "@/components/session-sync";
import { ComposerLauncher, openComposer } from "@/features/posts/composer";
import { RightRail } from "@/components/right-rail";
import { cn } from "@/lib/utils";

function NavLink({
  href,
  icon,
  label,
  active,
  badge,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] font-medium transition-colors",
        active
          ? "bg-surface-2 text-text"
          : "text-muted hover:bg-surface-2/60 hover:text-text",
      )}
    >
      <span
        className={cn(
          "grid size-5 place-items-center",
          active ? "text-accent" : "text-muted group-hover:text-text",
        )}
      >
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {badge && badge > 0 ? (
        <span className="min-w-5 rounded-full bg-accent px-1.5 py-0.5 text-center text-[10.5px] font-semibold leading-none text-accent-ink">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}

function Sidebar() {
  const pathname = usePathname();
  const { user, unread, logout } = useSession();
  if (!user) return null;

  const profileHref = `/u/${user.username}`;

  return (
    <aside className="sticky top-0 hidden h-dvh w-[228px] shrink-0 flex-col py-6 lg:flex">
      <div className="px-2">
        <Logo />
      </div>

      <nav className="mt-8 space-y-1" aria-label="Main navigation">
        <NavLink
          href="/feed"
          icon={<Home className="size-5" />}
          label="Home"
          active={pathname === "/feed"}
        />
        <NavLink
          href="/explore"
          icon={<Compass className="size-5" />}
          label="Explore"
          active={pathname.startsWith("/explore")}
        />
        <NavLink
          href="/notifications"
          icon={<Bell className="size-5" />}
          label="Notifications"
          active={pathname.startsWith("/notifications")}
          badge={unread}
        />
        <NavLink
          href={profileHref}
          icon={<UserIcon className="size-5" />}
          label="Profile"
          active={pathname === profileHref}
        />
        <NavLink
          href="/settings"
          icon={<Settings className="size-5" />}
          label="Settings"
          active={pathname.startsWith("/settings")}
        />

        <button
          type="button"
          onClick={openComposer}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[14px] font-semibold text-accent-ink transition-colors hover:bg-accent-hover active:scale-[0.98]"
        >
          <Plus className="size-4" />
          New post
        </button>
      </nav>

      <div className="mt-auto space-y-2 border-t border-line pt-4">
        <div className="flex items-center gap-2 px-1">
          <Link
            href={profileHref}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl p-1.5 transition-colors hover:bg-surface-2"
          >
            <Avatar user={user} size={34} />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[13px] font-semibold text-text">
                {user.name}
              </span>
              <span className="block truncate text-[11.5px] text-muted">
                @{user.username}
              </span>
            </span>
          </Link>
          <ThemeToggle />
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-text"
        >
          <LogOut className="size-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

function MobileHeader() {
  const { unread } = useSession();

  return (
    <header className="glass sticky top-0 z-30 border-b border-line lg:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <Logo />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Link
            href="/notifications"
            aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
            className="relative grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            <Bell className="size-[19px]" />
            {unread > 0 ? (
              <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[9.5px] font-bold leading-4 text-accent-ink">
                {unread > 9 ? "9+" : unread}
              </span>
            ) : null}
          </Link>
        </div>
      </div>
    </header>
  );
}

function MobileNav() {
  const pathname = usePathname();
  const { user, unread } = useSession();
  if (!user) return null;

  const profileHref = `/u/${user.username}`;
  const items = [
    { href: "/feed", icon: Home, label: "Home", active: pathname === "/feed" },
    {
      href: "/explore",
      icon: Compass,
      label: "Explore",
      active: pathname.startsWith("/explore"),
    },
    {
      href: "/notifications",
      icon: Bell,
      label: "Notifications",
      active: pathname.startsWith("/notifications"),
      badge: unread,
    },
    {
      href: profileHref,
      icon: UserIcon,
      label: "Profile",
      active: pathname === profileHref,
    },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      className="glass safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line lg:hidden"
    >
      <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-2">
        {items.slice(0, 2).map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              aria-label={item.label}
              className={cn(
                "relative grid h-11 place-items-center rounded-xl transition-colors",
                item.active ? "text-accent" : "text-muted hover:text-text",
              )}
            >
              <Icon className="size-[22px]" />
            </Link>
          );
        })}

        <div className="grid place-items-center">
          <button
            type="button"
            onClick={openComposer}
            aria-label="Create a post"
            className="grid size-11 place-items-center rounded-full bg-accent text-accent-ink shadow-lg shadow-accent/20 transition-transform active:scale-95"
          >
            <Plus className="size-5" />
          </button>
        </div>

        {items.slice(2).map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              aria-label={item.label}
              className={cn(
                "relative grid h-11 place-items-center rounded-xl transition-colors",
                item.active ? "text-accent" : "text-muted hover:text-text",
              )}
            >
              <Icon className="size-[22px]" />
              {"badge" in item && item.badge ? (
                <span className="absolute right-2 top-1.5 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[9px] font-bold leading-4 text-accent-ink">
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <OfflineBanner />
      <SessionSync />
      <ComposerLauncher />

      <MobileHeader />

      <div className="mx-auto flex w-full max-w-[1160px] gap-6 px-3 sm:px-5">
        <Sidebar />
        <main className="min-w-0 flex-1 pb-28 pt-4 lg:max-w-[620px] lg:py-8">
          {children}
        </main>
        <aside className="hidden w-[300px] shrink-0 py-8 xl:block">
          <div className="sticky top-8">
            <RightRail />
          </div>
        </aside>
      </div>

      <MobileNav />
    </>
  );
}
