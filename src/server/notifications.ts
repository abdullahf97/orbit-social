import "server-only";
import type { Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

type NotificationInput = {
  recipientId: string;
  actorId: string;
  type: "LIKE" | "COMMENT" | "FOLLOW";
  postId?: string | null;
  commentId?: string | null;
};

/**
 * Never notify yourself. Notifications are written inside the same
 * transaction as the action that caused them, so a rolled-back like never
 * leaves a phantom notification behind.
 */
export async function createNotification(tx: Tx, input: NotificationInput) {
  if (input.recipientId === input.actorId) return;

  await tx.notification.create({
    data: {
      recipientId: input.recipientId,
      actorId: input.actorId,
      type: input.type,
      postId: input.postId ?? null,
      commentId: input.commentId ?? null,
    },
  });
}
