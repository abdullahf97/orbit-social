# Architecture

Orbit is a small social app built to exercise the parts of a real product that are usually skipped in demos: cursor pagination that survives writes, optimistic UI with rollback, an offline mutation queue, denormalised counters, and a media pipeline that validates uploads twice.

The goal was not maximum features. It was to build each feature the way it would be built with users, and to leave the trade-offs visible.

---

## 1. System overview

```
┌──────────────────────────────── Browser ────────────────────────────────┐
│                                                                         │
│  React 19 (App Router)                                                  │
│    ├─ TanStack Query cache ──persist──▶ IndexedDB ("orbit" / "kv")      │
│    │     ├─ successful queries (feed, profile, notifications…)          │
│    │     └─ paused mutations (likes, comments, follows, posts)          │
│    │                                                                    │
│    ├─ service worker ──▶ shell + pages + image cache                    │
│    │                                                                    │
│    └─ fetch /api/* ─────────────────────────────┐                       │
└─────────────────────────────────────────────────┼───────────────────────┘
                                                  │
┌──────────────────────────── Next.js (Node) ─────▼───────────────────────┐
│  route handler                                                          │
│    ├─ assertSameOrigin (writes only)                                    │
│    ├─ requireUser → session cookie → SHA-256 → Session row               │
│    ├─ rateLimit (in-memory, per instance)                               │
│    ├─ parseBody / query params with Zod                                 │
│    ├─ Prisma transaction                                                │
│    │    ├─ write row                                                    │
│    │    ├─ update denormalised counters                                 │
│    │    └─ insert notification (never to yourself)                      │
│    └─ DTO serializer (no emails, no password hashes)                    │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
┌──────────────────────────── PostgreSQL 17 ──────────────────────────────┐
│  7 tables · 1 enum · 17 indexes                                         │
│  keyset indexes: (createdAt, id), (authorId, createdAt, id),            │
│                  (postId, createdAt), (recipientId, createdAt)          │
│  unique: (postId, userId) likes, (followerId, followingId) follows      │
│  cascading deletes from Post → likes, comments, notifications           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Data model

| Table | Purpose | Notable columns |
| --- | --- | --- |
| `User` | Accounts and public profiles | `username`/`email` unique, `postCount`, `followerCount`, `followingCount` |
| `Session` | Revocable login sessions | `tokenHash` unique (SHA-256), `expiresAt`, `revokedAt` |
| `Post` | Photos and captions | `likeCount`, `commentCount`, `(createdAt, id)` index |
| `Like` | Join table | unique `(postId, userId)` |
| `Comment` | Threads with one reply level | `parentId`, `(postId, createdAt)` index |
| `Follow` | Directed graph | unique `(followerId, followingId)`, two timeline indexes |
| `Notification` | Activity inbox | `(recipientId, createdAt)`, `(recipientId, readAt)` |

### Counters

`likeCount`, `commentCount`, `followerCount` and `postCount` are maintained inside the same transaction as the write that changes them.

Why: a feed of 20 posts would otherwise need four correlated aggregates, and follower counts would be a `COUNT(*)` on every profile view. Reads are the hot path here, so the write pays a little.

Why it is safe: the increment and the insert commit or roll back together. There is no background job that can drift, and the seed recomputes every counter from the join tables as a final step.

### Indexes

The indexes mirror the queries that actually run:

- `Post(createdAt, id)` — the following and explore feeds.
- `Post(authorId, createdAt, id)` — a profile grid.
- `Comment(postId, createdAt)` — a comment thread.
- `Follow(followerId, createdAt)` / `Follow(followingId, createdAt)` — following lists and the "who follows me" check.
- `Notification(recipientId, createdAt)` and `(recipientId, readAt)` — inbox and unread count.

---

## 3. Pagination

Offset pagination is the default mistake: `OFFSET 40` gets slower as the table grows, and rows shift when someone posts while you scroll, producing duplicates and gaps.

Orbit uses keyset pagination. A cursor is the last row's `(createdAt, id)` pair, base64url-encoded:

```ts
// src/lib/cursor.ts
{ createdAt: "2026-11-22T18:00:00.000Z", id: "cm..." }
```

The next page is:

```ts
where: {
  OR: [
    { createdAt: { lt: cursor.createdAt } },
    { createdAt: cursor.createdAt, id: { lt: cursor.id } },
  ],
},
orderBy: [{ createdAt: "desc" }, { id: "desc" }],
take: limit + 1,
```

`take: limit + 1` tells us whether a next page exists without a second query. The id tiebreaker makes the order total even when two posts share a timestamp.

A malformed cursor is a `400`, not "page one" — silently returning the first page hides client bugs.

The same primitive is reused for comments (ascending) and notifications.

---

## 4. Optimistic mutations

Every interaction that can be undone is optimistic: likes, follows, comments, comment deletion, notification read state, post deletion.

The pattern, using likes:

```ts
onMutate: async ({ postId, liked }) => {
  await queryClient.cancelQueries({ queryKey: ["feed"] });
  const snapshot = snapshotPostCaches(queryClient);   // feed, profile, search, detail
  patchPostEverywhere(queryClient, postId, (post) => ({
    ...post,
    likedByMe: liked,
    likeCount: Math.max(0, post.likeCount + (liked ? 1 : -1)),
  }));
  return { snapshot };
},
onError: (error, _vars, context) => {
  restoreQueries(queryClient, context.snapshot);
  toast.error(errorMessage(error));
},
onSuccess: (data, variables) => {
  patchPostEverywhere(queryClient, variables.postId, (post) => ({
    ...post,
    likedByMe: data.liked,
    likeCount: data.likeCount,          // trust the server's counter
  }));
},
```

Two details matter:

1. **Patch every cache.** A post appears in the following feed, the explore feed, a profile grid, search results and its own detail page. Patching only the visible list leaves stale copies behind.
2. **Reconcile with the server response.** The optimistic count is a guess; the server's count is the truth. `onSuccess` overwrites it.

`onMutate` cancels in-flight queries for the affected lists first, otherwise a refetch that started before the click can land after it and undo the optimistic patch.

---

## 5. Offline: three layers, one owner each

Offline support is not one feature; it is three caches with different responsibilities.

| Layer | Owns | Implementation |
| --- | --- | --- |
| **Service worker** | The app shell, HTML pages, images | `public/sw.js` — network-first for navigations, cache-first for static assets and images |
| **TanStack Query + IndexedDB** | API data and the mutation outbox | `PersistQueryClientProvider` with an `idb`-backed persister |
| **UI state** | Connectivity, pending count | `onlineManager` + `useSyncExternalStore` |

The service worker deliberately **does not touch `/api/*`**. Caching API responses in a service worker would fight TanStack's retry and invalidation logic. Each layer has one owner.

### Query cache

Successful queries are persisted with a 7-day `maxAge`. The session query is excluded — it is server-rendered into the layout and should not come from disk. Mutations are persisted too, which is what makes the outbox survive a reload.

### Mutation outbox

Queries use `networkMode: "offlineFirst"`; mutations use `"online"`. When the connection drops:

1. `onMutate` still runs, so the UI updates immediately.
2. The mutation pauses before its `mutationFn` is called.
3. It stays in the persisted mutation cache with its variables.
4. On the `online` event, TanStack resumes it.

Because a paused mutation can be replayed after a reload — or twice if a response is lost — every write endpoint is idempotent:

- likes and follows use unique constraints plus `skipDuplicates`;
- comments and posts accept a client-generated id (a dashless UUID), and a `P2002` on that id returns the existing row with `200` instead of creating a duplicate.

Image uploads are **not** queued: `File` objects cannot be serialised into IndexedDB. The composer keeps the caption as a local draft and asks for a connection before uploading.

### Cold loads while already offline

TanStack's `onlineManager` assumes online until it observes an `online`/`offline` event. A reload while already offline never fires one. `Providers` seeds the state from `navigator.onLine` when the client module loads, which is what makes the offline banner and paused mutations correct after a cold start.

---

## 6. Authentication and security

**Sessions, not JWTs.** Login creates a 32-byte random token, sets it as an `httpOnly`, `SameSite=Lax`, `Secure` (in production) cookie, and stores only its SHA-256 hash. Revoking a session is a `DELETE`. There is no signing key to leak and no refresh-token rotation to get wrong.

**Passwords.** `scrypt` from `node:crypto` (N=16384, r=8, p=1, 64-byte key, per-user salt), stored as `scrypt$N$r$p$salt$hash`. Chosen over bcrypt/argon2 because both need native binaries that complicate serverless builds; scrypt is memory-hard and built in. Verification uses `timingSafeEqual`.

**Account enumeration.** A failed login for a non-existent user still runs a scrypt verification against a dummy hash, so the response time does not reveal whether the account exists.

**CSRF.** Session cookies are `SameSite=Lax`, and every mutating handler checks the `Origin` header against `NEXT_PUBLIC_APP_URL` and the request host. Requests without an `Origin` (curl, server-to-server, Playwright's API client) are allowed.

**Input validation.** Zod schemas in `src/lib/schemas.ts` are shared by the client forms and the route handlers, so the rules cannot drift. API errors use one envelope: `{ error: { code, message, details? } }`.

**Headers.** `next.config.ts` sets `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` and HSTS.

**Rate limiting.** Fixed windows per IP and per identity for login, per user for comments. In-memory, therefore per instance — documented as a limitation rather than presented as production-grade.

---

## 7. Media pipeline

```
<input type=file>
  → validateImageFile (type + 4 MB cap)
  → URL.createObjectURL  (instant preview, nothing uploaded yet)
  → prepareImage: if > 1.2 MB, downscale with canvas to ≤1600px WebP
  → POST /api/uploads (multipart)
      → sharp: decode (rejects non-images), rotate by EXIF, strip metadata
      → 1600px WebP (q82) + 480px thumbnail (q70)
      → local disk in dev / Vercel Blob in production
  → { url, thumbUrl, width, height }
```

The browser downscale exists because Vercel caps request bodies at 4.5 MB and phone cameras produce 4–12 MB files. The server re-encodes anyway, so a client that skips the downscale cannot bypass validation.

`isAllowedImageUrl` restricts post images to `/uploads/*` or the project's Vercel Blob host, which blocks hot-linking, tracking pixels and `javascript:`/`data:` URLs.

---

## 8. Rendering

- The landing page is a server component that reads the three most-liked posts for its collage.
- The authenticated layout is a server component: it resolves the session, loads the current user and unread count, and passes them into a client `SessionProvider`. This avoids a client-side "who am I" waterfall on every page.
- Everything inside the shell is client-rendered because it is interactive and cache-driven.
- The service worker is registered only in production, so development reloads are never served stale HTML.

---

## 9. Testing strategy

| Layer | Tool | What it protects |
| --- | --- | --- |
| Pure logic | Vitest | Cursor encoding, password hashing, Zod schemas, formatting |
| API | `scripts/smoke.mjs` | 23 checks against a running server: auth, pagination, idempotent replays, uploads, counters |
| Browser | Playwright | 16 tests against a production build, including the service worker and IndexedDB |

The Playwright suite runs against `next start` on purpose: the service worker and the persisted cache only exist in a production build. A single setup project signs in once and saves `storageState`, keeping the suite under the login rate limit.

Two bugs found by the E2E suite, both invisible to unit tests:

1. **Infinite scroll never attached.** The sentinel mounts only after the first page of data, but `useInView` observed a `useRef` in a mount-only effect. The ref was `null` when the effect ran, so the observer was never created. Fixed with a callback ref.
2. **A cold offline reload looked online.** `onlineManager` starts as `true` and waits for an event that never comes if the page loads offline. Fixed by seeding it from `navigator.onLine`.

---

## 10. Trade-offs and what I would change at scale

| Decision | Cost | At scale |
| --- | --- | --- |
| In-memory rate limiting | Resets on cold starts; not shared across instances | Upstash Redis behind the same `rateLimit` interface |
| Polling notifications | Up to 20s latency, wasted requests when idle | SSE or WebSocket on a stateful host, or managed pub/sub |
| Denormalised counters | Write transactions are slightly larger | Same approach, plus a reconciliation job if manual SQL is ever allowed |
| Single-region Postgres | Higher latency for distant users | Read replicas and region-aware routing |
| `sharp` in the request path | CPU-bound uploads | Offload to a queue + worker, or use a managed image service |
| No email verification / reset | Seed-based demo accounts only | Transactional email provider + signed tokens |
| Local disk storage in dev | Not deployable as-is | Vercel Blob (already supported) or S3 |

---

## 11. Local development

```bash
npm run db:up        # docker compose up -d db
npm run db:migrate
npm run db:seed      # deterministic artwork, users, posts, likes, follows
npm run dev
```

The seed is deterministic: a `mulberry32` PRNG generates the same abstract artwork and the same like/comment distribution on every run. It writes WebP files to `public/uploads/seed` (gitignored) or to Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set.

For a production build with the service worker active:

```bash
npm run build && npm start
npm run test:e2e
```
