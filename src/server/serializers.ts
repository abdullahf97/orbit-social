import "server-only";
import type {
  CommentDto,
  CurrentUser,
  NotificationDto,
  PostDto,
  PublicUser,
} from "@/lib/schemas";

type AuthorRow = {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
};

export function toPostDto(
  post: {
    id: string;
    caption: string;
    imageUrl: string | null;
    imageWidth: number | null;
    imageHeight: number | null;
    createdAt: Date;
    likeCount: number;
    commentCount: number;
    author: AuthorRow;
    likes?: { userId: string }[];
  },
  viewerId: string | null,
): PostDto {
  return {
    id: post.id,
    caption: post.caption,
    imageUrl: post.imageUrl,
    imageWidth: post.imageWidth,
    imageHeight: post.imageHeight,
    createdAt: post.createdAt.toISOString(),
    author: post.author,
    likeCount: post.likeCount,
    commentCount: post.commentCount,
    likedByMe: Boolean(
      viewerId && post.likes?.some((like) => like.userId === viewerId),
    ),
  };
}

export function toCommentDto(
  comment: {
    id: string;
    body: string;
    createdAt: Date;
    parentId: string | null;
    authorId: string;
    author: AuthorRow;
  },
  viewerId: string | null,
): CommentDto {
  return {
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
    parentId: comment.parentId,
    author: comment.author,
    isMine: comment.authorId === viewerId,
  };
}

export function toPublicUser(user: {
  id: string;
  username: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  followerCount: number;
  followingCount: number;
  postCount: number;
}): PublicUser {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    followerCount: user.followerCount,
    followingCount: user.followingCount,
    postCount: user.postCount,
  };
}

export function toCurrentUser(user: {
  id: string;
  username: string;
  name: string;
  email: string;
  bio: string | null;
  avatarUrl: string | null;
  followerCount: number;
  followingCount: number;
  postCount: number;
}): CurrentUser {
  return { ...toPublicUser(user), email: user.email };
}

export function toNotificationDto(
  notification: {
    id: string;
    type: "LIKE" | "COMMENT" | "FOLLOW";
    createdAt: Date;
    readAt: Date | null;
    actor: AuthorRow;
    post: { id: string; imageUrl: string | null; caption: string } | null;
    comment: { body: string } | null;
  },
): NotificationDto {
  return {
    id: notification.id,
    type: notification.type,
    createdAt: notification.createdAt.toISOString(),
    readAt: notification.readAt?.toISOString() ?? null,
    actor: notification.actor,
    post: notification.post,
    preview: notification.comment?.body ?? null,
  };
}
