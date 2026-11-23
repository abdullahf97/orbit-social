import type { InfiniteData, QueryClient, QueryKey } from "@tanstack/react-query";
import type {
  CommentDto,
  FeedPage,
  NotificationDto,
  PostDto,
  ProfileResponse,
  PublicUser,
} from "@/lib/schemas";

export type Snapshot = Array<[QueryKey, unknown]>;

export function snapshotQueries(
  queryClient: QueryClient,
  filters: QueryKey[],
): Snapshot {
  return filters.flatMap((queryKey) => queryClient.getQueriesData({ queryKey }));
}

export function restoreQueries(queryClient: QueryClient, snapshot: Snapshot) {
  for (const [key, data] of snapshot) {
    queryClient.setQueryData(key, data);
  }
}

export function snapshotPostCaches(queryClient: QueryClient): Snapshot {
  return snapshotQueries(queryClient, [
    ["feed"],
    ["user-posts"],
    ["search"],
    ["post"],
  ]);
}

export function snapshotCommentCaches(queryClient: QueryClient): Snapshot {
  return snapshotQueries(queryClient, [["comments"], ...postCacheKeys()]);
}

function postCacheKeys(): QueryKey[] {
  return [["feed"], ["user-posts"], ["search"], ["post"]];
}

function mapPages(
  data: InfiniteData<FeedPage> | undefined,
  postId: string,
  patch: (post: PostDto) => PostDto,
): InfiniteData<FeedPage> | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((post) => (post.id === postId ? patch(post) : post)),
    })),
  };
}

/** Applies a change to one post everywhere it is cached. */
export function patchPostEverywhere(
  queryClient: QueryClient,
  postId: string,
  patch: (post: PostDto) => PostDto,
) {
  queryClient.setQueriesData<InfiniteData<FeedPage>>(
    { queryKey: ["feed"] },
    (data) => mapPages(data, postId, patch),
  );

  queryClient.setQueriesData<InfiniteData<FeedPage>>(
    { queryKey: ["user-posts"] },
    (data) => mapPages(data, postId, patch),
  );

  queryClient.setQueriesData<{ posts: PostDto[] }>(
    { queryKey: ["search"] },
    (data) => {
      if (!data) return data;
      return {
        ...data,
        posts: data.posts.map((post) => (post.id === postId ? patch(post) : post)),
      };
    },
  );

  queryClient.setQueryData<{ post: PostDto }>(
    ["post", postId],
    (data) => (data ? { post: patch(data.post) } : data),
  );
}

export function prependPost(queryClient: QueryClient, post: PostDto) {
  for (const mode of ["following", "explore"] as const) {
    queryClient.setQueryData<InfiniteData<FeedPage>>(
      ["feed", mode],
      (data) => {
        if (!data) return data;
        const [first, ...rest] = data.pages;
        if (!first) return data;
        if (first.items.some((item) => item.id === post.id)) return data;
        return {
          ...data,
          pages: [{ ...first, items: [post, ...first.items] }, ...rest],
        };
      },
    );
  }

  queryClient.setQueryData<InfiniteData<FeedPage>>(
    ["user-posts", post.author.username.toLowerCase()],
    (data) => {
      if (!data) return data;
      const [first, ...rest] = data.pages;
      if (!first) return data;
      return {
        ...data,
        pages: [{ ...first, items: [post, ...first.items] }, ...rest],
      };
    },
  );
}

export function removePostEverywhere(queryClient: QueryClient, postId: string) {
  for (const prefix of [["feed"], ["user-posts"]] as const) {
    queryClient.setQueriesData<InfiniteData<FeedPage>>(
      { queryKey: prefix },
      (data) => {
        if (!data) return data;
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.filter((post) => post.id !== postId),
          })),
        };
      },
    );
  }

  queryClient.setQueriesData<{ posts: PostDto[] }>(
    { queryKey: ["search"] },
    (data) =>
      data
        ? { ...data, posts: data.posts.filter((post) => post.id !== postId) }
        : data,
  );

  queryClient.removeQueries({ queryKey: ["post", postId] });
}

export function appendComment(
  queryClient: QueryClient,
  postId: string,
  comment: CommentDto,
) {
  queryClient.setQueryData<InfiniteData<{ items: CommentDto[]; nextCursor: string | null }>>(
    ["comments", postId],
    (data) => {
      if (!data) return data;
      const lastIndex = data.pages.length - 1;
      const pages = data.pages.map((page, index) => {
        if (index !== lastIndex) return page;
        if (page.items.some((item) => item.id === comment.id)) return page;
        return { ...page, items: [...page.items, comment] };
      });
      return { ...data, pages };
    },
  );
}

export function replaceComment(
  queryClient: QueryClient,
  postId: string,
  tempId: string,
  comment: CommentDto,
) {
  queryClient.setQueryData<InfiniteData<{ items: CommentDto[]; nextCursor: string | null }>>(
    ["comments", postId],
    (data) => {
      if (!data) return data;
      return {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          items: page.items.map((item) => (item.id === tempId ? comment : item)),
        })),
      };
    },
  );
}

export function removeComment(
  queryClient: QueryClient,
  postId: string,
  commentId: string,
) {
  queryClient.setQueryData<InfiniteData<{ items: CommentDto[]; nextCursor: string | null }>>(
    ["comments", postId],
    (data) => {
      if (!data) return data;
      return {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          items: page.items.filter(
            (item) => item.id !== commentId && item.parentId !== commentId,
          ),
        })),
      };
    },
  );
}

export function patchProfileFollow(
  queryClient: QueryClient,
  username: string,
  patch: (profile: ProfileResponse) => ProfileResponse,
) {
  queryClient.setQueryData<ProfileResponse>(
    ["profile", username.toLowerCase()],
    (data) => (data ? patch(data) : data),
  );
}

export function removeSuggestion(queryClient: QueryClient, userId: string) {
  queryClient.setQueryData<{ users: PublicUser[] }>(keysSuggestions, (data) =>
    data ? { ...data, users: data.users.filter((user) => user.id !== userId) } : data,
  );
}

const keysSuggestions = ["suggestions"] as const;

export function patchNotificationsRead(
  queryClient: QueryClient,
  ids?: string[],
) {
  const now = new Date().toISOString();
  queryClient.setQueryData<InfiniteData<{ items: NotificationDto[]; nextCursor: string | null; unreadCount: number }>>(
    ["notifications", "list"],
    (data) => {
      if (!data) return data;
      return {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          items: page.items.map((item) =>
            !ids || ids.includes(item.id) ? { ...item, readAt: item.readAt ?? now } : item,
          ),
          unreadCount: 0,
        })),
      };
    },
  );
}
