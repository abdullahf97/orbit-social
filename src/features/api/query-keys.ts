export type FeedMode = "following" | "explore";

export const keys = {
  session: ["session"] as const,
  feed: (mode: FeedMode) => ["feed", mode] as const,
  feeds: ["feed"] as const,
  post: (id: string) => ["post", id] as const,
  comments: (postId: string) => ["comments", postId] as const,
  profile: (username: string) => ["profile", username.toLowerCase()] as const,
  userPosts: (username: string) =>
    ["user-posts", username.toLowerCase()] as const,
  notifications: ["notifications", "list"] as const,
  unread: ["notifications", "unread"] as const,
  suggestions: ["suggestions"] as const,
  search: (query: string) => ["search", query.trim().toLowerCase()] as const,
  pending: ["pending"] as const,
};
