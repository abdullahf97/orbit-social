"use client";

import {
  keepPreviousData,
  onlineManager,
  useInfiniteQuery,
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { apiFetch, errorMessage } from "./client";
import { keys, type FeedMode } from "./query-keys";
import {
  appendComment,
  patchNotificationsRead,
  patchPostEverywhere,
  patchProfileFollow,
  prependPost,
  removeComment,
  removePostEverywhere,
  removeSuggestion,
  replaceComment,
  restoreQueries,
  snapshotCommentCaches,
  snapshotPostCaches,
  snapshotQueries,
} from "./cache";
import {
  createComment,
  createPost,
  deleteCommentRequest,
  deletePostRequest,
  followUser,
  likePost,
  markReadRequest,
  mutationKeys,
  updateProfileRequest,
  type CommentVariables,
  type DeleteCommentVariables,
  type FollowVariables,
  type LikeVariables,
  type MarkReadVariables,
} from "./mutations";
import { useSession } from "@/features/auth/session";
import type {
  CommentDto,
  FeedPage,
  NotificationDto,
  PostDto,
  ProfileResponse,
  PublicUser,
} from "@/lib/schemas";
import { createClientId } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Connectivity
// ---------------------------------------------------------------------------

export function useOnline(): boolean {
  return useSyncExternalStore(
    (callback) => onlineManager.subscribe(callback),
    () => onlineManager.isOnline(),
    () => true,
  );
}

/** Mutations waiting for a connection (TanStack's persisted mutation cache). */
export function usePendingMutationCount(): number {
  const states = useMutationState({
    filters: { status: "pending" },
    select: (mutation) => mutation.state.isPaused,
  });
  return states.filter(Boolean).length;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useFeed(mode: FeedMode) {
  return useInfiniteQuery({
    queryKey: keys.feed(mode),
    queryFn: ({ pageParam, signal }) => {
      const params = new URLSearchParams({ mode });
      if (pageParam) params.set("cursor", pageParam);
      return apiFetch<FeedPage>(`/api/feed?${params.toString()}`, { signal });
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function usePost(postId: string) {
  return useQuery({
    queryKey: keys.post(postId),
    queryFn: ({ signal }) =>
      apiFetch<{ post: PostDto }>(`/api/posts/${postId}`, { signal }),
    enabled: Boolean(postId),
  });
}

export function useComments(postId: string) {
  return useInfiniteQuery({
    queryKey: keys.comments(postId),
    queryFn: ({ pageParam, signal }) => {
      const params = new URLSearchParams();
      if (pageParam) params.set("cursor", pageParam);
      return apiFetch<{ items: CommentDto[]; nextCursor: string | null }>(
        `/api/posts/${postId}/comments?${params.toString()}`,
        { signal },
      );
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(postId),
  });
}

export function useProfile(username: string) {
  return useQuery({
    queryKey: keys.profile(username),
    queryFn: ({ signal }) =>
      apiFetch<ProfileResponse>(`/api/users/${username}`, { signal }),
    enabled: Boolean(username),
  });
}

export function useUserPosts(username: string) {
  return useInfiniteQuery({
    queryKey: keys.userPosts(username),
    queryFn: ({ pageParam, signal }) => {
      const params = new URLSearchParams();
      if (pageParam) params.set("cursor", pageParam);
      return apiFetch<FeedPage>(
        `/api/users/${username}/posts?${params.toString()}`,
        { signal },
      );
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(username),
  });
}

export function useNotifications() {
  return useInfiniteQuery({
    queryKey: keys.notifications,
    queryFn: ({ pageParam, signal }) => {
      const params = new URLSearchParams();
      if (pageParam) params.set("cursor", pageParam);
      return apiFetch<{
        items: NotificationDto[];
        nextCursor: string | null;
        unreadCount: number;
      }>(`/api/notifications?${params.toString()}`, { signal });
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    refetchInterval: 30_000,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: keys.unread,
    queryFn: ({ signal }) =>
      apiFetch<{ count: number }>("/api/notifications/unread-count", {
        signal,
      }),
    refetchInterval: 20_000,
    refetchIntervalInBackground: false,
    staleTime: 10_000,
  });
}

export function useSuggestions() {
  return useQuery({
    queryKey: keys.suggestions,
    queryFn: ({ signal }) =>
      apiFetch<{ users: PublicUser[] }>("/api/suggestions", { signal }),
    staleTime: 60_000,
  });
}

export function useSearch(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: keys.search(trimmed),
    queryFn: ({ signal }) =>
      apiFetch<{ users: PublicUser[]; posts: PostDto[] }>(
        `/api/search?q=${encodeURIComponent(trimmed)}`,
        { signal },
      ),
    enabled: trimmed.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

// ---------------------------------------------------------------------------
// Likes
// ---------------------------------------------------------------------------

export function useToggleLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.like,
    mutationFn: likePost,
    onMutate: async ({ postId, liked }: LikeVariables) => {
      await queryClient.cancelQueries({ queryKey: ["feed"] });
      await queryClient.cancelQueries({ queryKey: ["user-posts"] });

      const snapshot = snapshotPostCaches(queryClient);
      patchPostEverywhere(queryClient, postId, (post) => ({
        ...post,
        likedByMe: liked,
        likeCount: Math.max(0, post.likeCount + (liked ? 1 : -1)),
      }));

      return { snapshot };
    },
    onError: (error, _variables, context) => {
      if (context) restoreQueries(queryClient, context.snapshot);
      toast.error(errorMessage(error));
    },
    onSuccess: (data, variables) => {
      patchPostEverywhere(queryClient, variables.postId, (post) => ({
        ...post,
        likedByMe: data.liked,
        likeCount: data.likeCount,
      }));
    },
  });
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export function useAddComment(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.comment,
    mutationFn: createComment,
    onMutate: async (variables: CommentVariables) => {
      await queryClient.cancelQueries({ queryKey: keys.comments(postId) });
      const snapshot = snapshotCommentCaches(queryClient);

      const optimistic: CommentDto = {
        id: variables.clientId,
        body: variables.body,
        createdAt: new Date().toISOString(),
        parentId: variables.parentId,
        author: variables.author,
        isMine: true,
      };

      appendComment(queryClient, postId, optimistic);
      patchPostEverywhere(queryClient, postId, (post) => ({
        ...post,
        commentCount: post.commentCount + 1,
      }));

      return { snapshot };
    },
    onError: (error, _variables, context) => {
      if (context) restoreQueries(queryClient, context.snapshot);
      toast.error(errorMessage(error));
    },
    onSuccess: (data, variables) => {
      replaceComment(queryClient, postId, variables.clientId, data.comment);
      patchPostEverywhere(queryClient, postId, (post) => ({
        ...post,
        commentCount: data.commentCount,
      }));
    },
  });
}

export function useDeleteComment(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.deleteComment,
    mutationFn: deleteCommentRequest,
    onMutate: async (variables: DeleteCommentVariables) => {
      const snapshot = snapshotCommentCaches(queryClient);
      removeComment(queryClient, postId, variables.commentId);
      patchPostEverywhere(queryClient, postId, (post) => ({
        ...post,
        commentCount: Math.max(0, post.commentCount - 1),
      }));
      return { snapshot };
    },
    onError: (error, _variables, context) => {
      if (context) restoreQueries(queryClient, context.snapshot);
      toast.error(errorMessage(error));
    },
    onSuccess: (data) => {
      // Replies are deleted too; reconcile the optimistic single decrement.
      const extra = Math.max(0, data.removed - 1);
      if (extra > 0) {
        patchPostEverywhere(queryClient, postId, (post) => ({
          ...post,
          commentCount: Math.max(0, post.commentCount - extra),
        }));
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Follows
// ---------------------------------------------------------------------------

export function useFollow() {
  const queryClient = useQueryClient();
  const { user, patchUser } = useSession();

  return useMutation({
    mutationKey: mutationKeys.follow,
    mutationFn: followUser,
    onMutate: async ({ username, following }: FollowVariables) => {
      const snapshot = snapshotQueries(queryClient, [
        ["profile"],
        ["suggestions"],
      ]);
      const delta = following ? 1 : -1;
      const previousFollowingCount = user?.followingCount ?? 0;

      patchProfileFollow(queryClient, username, (profile) => ({
        ...profile,
        isFollowing: following,
        user: {
          ...profile.user,
          followerCount: Math.max(0, profile.user.followerCount + delta),
        },
      }));

      if (following) {
        const profile = queryClient.getQueryData<ProfileResponse>(
          keys.profile(username),
        );
        if (profile) removeSuggestion(queryClient, profile.user.id);
      }

      patchUser({
        followingCount: Math.max(0, previousFollowingCount + delta),
      });

      return { snapshot, previousFollowingCount };
    },
    onError: (error, _variables, context) => {
      if (context) {
        restoreQueries(queryClient, context.snapshot);
        patchUser({ followingCount: context.previousFollowingCount });
      }
      toast.error(errorMessage(error));
    },
    onSuccess: (data, variables) => {
      patchProfileFollow(queryClient, variables.username, (profile) => ({
        ...profile,
        isFollowing: data.following,
        user: { ...profile.user, followerCount: data.followerCount },
      }));
      if (!data.following) {
        void queryClient.invalidateQueries({ queryKey: keys.suggestions });
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

export function useCreatePost() {
  const queryClient = useQueryClient();
  const { user, patchUser } = useSession();

  return useMutation({
    mutationKey: mutationKeys.createPost,
    mutationFn: createPost,
    onSuccess: ({ post }) => {
      prependPost(queryClient, post);
      queryClient.setQueryData(keys.post(post.id), { post });
      patchUser({ postCount: (user?.postCount ?? 0) + 1 });
      toast.success("Posted");
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  const { user, patchUser } = useSession();

  return useMutation({
    mutationKey: mutationKeys.deletePost,
    mutationFn: deletePostRequest,
    onMutate: async ({ postId }) => {
      const snapshot = snapshotPostCaches(queryClient);
      removePostEverywhere(queryClient, postId);
      return { snapshot };
    },
    onError: (error, _variables, context) => {
      if (context) restoreQueries(queryClient, context.snapshot);
      toast.error(errorMessage(error));
    },
    onSuccess: () => {
      patchUser({ postCount: Math.max(0, (user?.postCount ?? 1) - 1) });
      toast.success("Post deleted");
    },
  });
}

// ---------------------------------------------------------------------------
// Profile & notifications
// ---------------------------------------------------------------------------

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { patchUser } = useSession();

  return useMutation({
    mutationKey: mutationKeys.updateProfile,
    mutationFn: updateProfileRequest,
    onSuccess: ({ user }) => {
      patchUser(user);
      queryClient.setQueryData<ProfileResponse>(
        keys.profile(user.username),
        (profile) => (profile ? { ...profile, user } : profile),
      );
      toast.success("Profile updated");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  const { setUnread } = useSession();

  return useMutation({
    mutationKey: mutationKeys.markRead,
    mutationFn: markReadRequest,
    onMutate: async (variables: MarkReadVariables) => {
      const snapshot = snapshotQueries(queryClient, [
        ["notifications"],
      ]);
      patchNotificationsRead(queryClient, variables.ids);
      setUnread(0);
      return { snapshot };
    },
    onError: (error, _variables, context) => {
      if (context) restoreQueries(queryClient, context.snapshot);
      toast.error(errorMessage(error));
    },
    onSuccess: (data) => {
      setUnread(data.unreadCount);
    },
  });
}

// ---------------------------------------------------------------------------
// Upload helper (not queued offline — File objects are not serialisable)
// ---------------------------------------------------------------------------

export type UploadedImage = {
  url: string;
  thumbUrl: string | null;
  width: number;
  height: number;
};

export async function uploadImage(
  file: File,
  kind: "post" | "avatar" = "post",
): Promise<UploadedImage> {
  const form = new FormData();
  form.append("file", file);
  form.append("kind", kind);
  return apiFetch<UploadedImage>("/api/uploads", {
    method: "POST",
    body: form,
  });
}

export function newClientId() {
  return createClientId();
}
