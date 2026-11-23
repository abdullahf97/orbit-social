import { z } from "zod";

export const RESERVED_USERNAMES = new Set([
  "admin",
  "api",
  "auth",
  "explore",
  "feed",
  "help",
  "login",
  "logout",
  "notifications",
  "orbit",
  "p",
  "privacy",
  "settings",
  "signup",
  "support",
  "terms",
  "u",
  "about",
  "me",
  "new",
  "search",
  "static",
  "uploads",
]);

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters.")
  .max(20, "Username must be 20 characters or fewer.")
  .regex(
    /^[a-zA-Z0-9_]+$/,
    "Use letters, numbers and underscores only.",
  )
  .transform((value) => value.toLowerCase())
  .refine((value) => !RESERVED_USERNAMES.has(value), {
    message: "That username is reserved.",
  });

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be 72 characters or fewer.");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address.").max(254, "Email is too long."));

export const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required.")
  .max(50, "Name must be 50 characters or fewer.");

export const signupSchema = z.object({
  name: nameSchema,
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Enter your username or email.")
    .max(254),
  password: z.string().min(1, "Enter your password.").max(72),
});

export const postSchema = z.object({
  clientId: z.string().min(8).max(64).optional(),
  caption: z.string().trim().max(2200, "Caption is too long.").default(""),
  imageUrl: z.string().max(500).nullable().optional(),
  imageWidth: z.number().int().positive().max(20_000).optional(),
  imageHeight: z.number().int().positive().max(20_000).optional(),
});

export const commentSchema = z.object({
  clientId: z.string().min(8).max(64).optional(),
  body: z
    .string()
    .trim()
    .min(1, "Write something first.")
    .max(1000, "Comment is too long."),
  parentId: z.string().min(1).max(64).nullable().optional(),
});

export const profileSchema = z.object({
  name: nameSchema.optional(),
  bio: z
    .string()
    .trim()
    .max(160, "Bio must be 160 characters or fewer.")
    .nullable()
    .optional(),
  avatarUrl: z.string().max(500).nullable().optional(),
});

export const notificationReadSchema = z.object({
  ids: z.array(z.string().min(1).max(64)).max(100).optional(),
  all: z.boolean().optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PostInput = z.infer<typeof postSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;

/** Shared DTOs — the contract between route handlers and the client cache. */
export type PublicUser = {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  followerCount: number;
  followingCount: number;
  postCount: number;
};

/** Only ever returned for the signed-in user — never in search or profiles. */
export type CurrentUser = PublicUser & { email: string };

export type PostAuthor = {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
};

export type PostDto = {
  id: string;
  caption: string;
  imageUrl: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  createdAt: string;
  author: PostAuthor;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
};

export type CommentDto = {
  id: string;
  body: string;
  createdAt: string;
  parentId: string | null;
  author: PostAuthor;
  isMine: boolean;
};

export type NotificationDto = {
  id: string;
  type: "LIKE" | "COMMENT" | "FOLLOW";
  createdAt: string;
  readAt: string | null;
  actor: PostAuthor;
  post: { id: string; imageUrl: string | null; caption: string } | null;
  preview: string | null;
};

export type FeedPage = {
  items: PostDto[];
  nextCursor: string | null;
};

export type ProfileResponse = {
  user: PublicUser;
  isMe: boolean;
  isFollowing: boolean;
  followsMe: boolean;
};

export type SessionResponse = {
  user: CurrentUser | null;
  unreadNotifications: number;
};
