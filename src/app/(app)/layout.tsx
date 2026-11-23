import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { toCurrentUser } from "@/server/serializers";
import { SessionProvider } from "@/features/auth/session";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/login");

  const [user, unread] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: authUser.id },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        bio: true,
        avatarUrl: true,
        followerCount: true,
        followingCount: true,
        postCount: true,
      },
    }),
    db.notification.count({
      where: { recipientId: authUser.id, readAt: null },
    }),
  ]);

  return (
    <SessionProvider initialUser={toCurrentUser(user)} initialUnread={unread}>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
