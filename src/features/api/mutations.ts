import type { QueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type { CommentDto, PostDto, PublicUser } from "@/lib/schemas";

/**
 * Mutation keys are registered globally so that mutations paused while offline
 * survive a reload: TanStack persists the variables and replays them once the
 * app is back online. Every endpoint used here is idempotent (unique
 * constraints for likes/follows, client-generated ids for comments/posts).
 */
export const mutationKeys = {
  like: ["like"] as const,
  comment: ["comment"] as const,
  deleteComment: ["comment-delete"] as const,
  follow: ["follow"] as const,
  createPost: ["create-post"] as const,
  deletePost: ["delete-post"] as const,
  updateProfile: ["update-profile"] as const,
  markRead: ["mark-read"] as const,
};

export type LikeVariables = { postId: string; liked: boolean };

export type CommentVariables = {
  postId: string;
  body: string;
  parentId: string | null;
  clientId: string;
  author: Pick<PublicUser, "id" | "username" | "name" | "avatarUrl">;
};

export type DeleteCommentVariables = { commentId: string; postId: string };

export type FollowVariables = { username: string; following: boolean };

export type CreatePostVariables = {
  clientId: string;
  caption: string;
  imageUrl?: string | null;
  imageWidth?: number;
  imageHeight?: number;
};

export type UpdateProfileVariables = {
  name?: string;
  bio?: string | null;
  avatarUrl?: string | null;
};

export type MarkReadVariables = { ids?: string[]; all?: boolean };

export async function likePost(variables: LikeVariables) {
  return apiFetch<{ liked: boolean; likeCount: number }>(
    `/api/posts/${variables.postId}/like`,
    { method: variables.liked ? "POST" : "DELETE" },
  );
}

export async function createComment(variables: CommentVariables) {
  return apiFetch<{ comment: CommentDto; commentCount: number }>(
    `/api/posts/${variables.postId}/comments`,
    {
      method: "POST",
      body: JSON.stringify({
        clientId: variables.clientId,
        body: variables.body,
        parentId: variables.parentId,
      }),
    },
  );
}

export async function deleteCommentRequest(variables: DeleteCommentVariables) {
  return apiFetch<{ ok: boolean; removed: number }>(
    `/api/comments/${variables.commentId}`,
    { method: "DELETE" },
  );
}

export async function followUser(variables: FollowVariables) {
  return apiFetch<{ following: boolean; followerCount: number }>(
    `/api/users/${encodeURIComponent(variables.username)}/follow`,
    { method: variables.following ? "POST" : "DELETE" },
  );
}

export async function createPost(variables: CreatePostVariables) {
  return apiFetch<{ post: PostDto }>("/api/posts", {
    method: "POST",
    body: JSON.stringify(variables),
  });
}

export async function deletePostRequest(variables: { postId: string }) {
  return apiFetch<{ ok: boolean }>(`/api/posts/${variables.postId}`, {
    method: "DELETE",
  });
}

export async function updateProfileRequest(variables: UpdateProfileVariables) {
  return apiFetch<{ user: PublicUser }>("/api/users/me", {
    method: "PATCH",
    body: JSON.stringify(variables),
  });
}

export async function markReadRequest(variables: MarkReadVariables) {
  return apiFetch<{ ok: boolean; unreadCount: number }>(
    "/api/notifications/read",
    { method: "POST", body: JSON.stringify(variables) },
  );
}

export function registerMutationDefaults(queryClient: QueryClient) {
  queryClient.setMutationDefaults(mutationKeys.like, {
    mutationFn: likePost,
  });
  queryClient.setMutationDefaults(mutationKeys.comment, {
    mutationFn: createComment,
  });
  queryClient.setMutationDefaults(mutationKeys.deleteComment, {
    mutationFn: deleteCommentRequest,
  });
  queryClient.setMutationDefaults(mutationKeys.follow, {
    mutationFn: followUser,
  });
  queryClient.setMutationDefaults(mutationKeys.createPost, {
    mutationFn: createPost,
  });
  queryClient.setMutationDefaults(mutationKeys.deletePost, {
    mutationFn: deletePostRequest,
  });
  queryClient.setMutationDefaults(mutationKeys.updateProfile, {
    mutationFn: updateProfileRequest,
  });
  queryClient.setMutationDefaults(mutationKeys.markRead, {
    mutationFn: markReadRequest,
  });
}
