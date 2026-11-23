/**
 * End-to-end API smoke test against a running server.
 * Usage: npm run smoke   (with `npm run dev` or `npm start` in another shell)
 */
const base = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

let cookie = "";
let failures = 0;

function log(name, ok, detail = "") {
  const mark = ok ? "✔" : "✘";
  if (!ok) failures += 1;
  console.log(`${mark} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      origin: base,
      ...(cookie ? { cookie } : {}),
      ...(options.body && !(options.body instanceof FormData)
        ? { "content-type": "application/json" }
        : {}),
      ...options.headers,
    },
  });

  const setCookie = response.headers.getSetCookie?.() ?? [];
  for (const entry of setCookie) {
    const pair = entry.split(";")[0];
    if (pair?.startsWith("orbit_session=")) cookie = pair;
  }

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: response.status, data, headers: response.headers };
}

async function main() {
  console.log(`\nOrbit API smoke test → ${base}\n`);

  const health = await request("/api/health");
  log("health", health.status === 200 && health.data?.database === "up");

  const anonymous = await request("/api/feed");
  log("feed requires auth", anonymous.status === 401);

  const badLogin = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier: "nova@orbit.app", password: "nope" }),
  });
  log("rejects a wrong password", badLogin.status === 401);

  const login = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier: "nova@orbit.app", password: "orbitdemo" }),
  });
  log(
    "demo login",
    login.status === 200 && Boolean(login.data?.user?.username),
    login.data?.user?.username,
  );

  const session = await request("/api/auth/session");
  log(
    "session returns the current user",
    session.data?.user?.email === "nova@orbit.app",
  );

  const feed = await request("/api/feed?mode=following");
  const first = feed.data?.items?.[0];
  log("following feed", feed.status === 200 && Array.isArray(feed.data?.items), `${feed.data?.items?.length ?? 0} posts`);

  const explore = await request("/api/feed?mode=explore&limit=5");
  log(
    "explore feed paginates",
    explore.status === 200 && Boolean(explore.data?.nextCursor),
  );

  const page2 = await request(
    `/api/feed?mode=explore&limit=5&cursor=${encodeURIComponent(explore.data?.nextCursor ?? "")}`,
  );
  log(
    "cursor returns a disjoint page",
    page2.status === 200 &&
      page2.data.items.every(
        (item) => !explore.data.items.some((firstItem) => firstItem.id === item.id),
      ),
  );

  if (first) {
    const like = await request(`/api/posts/${first.id}/like`, { method: "POST" });
    log("like a post", like.status === 200 && like.data?.liked === true);

    const replay = await request(`/api/posts/${first.id}/like`, { method: "POST" });
    log(
      "like is idempotent",
      replay.status === 200 && replay.data?.likeCount === like.data?.likeCount,
    );

    const unlike = await request(`/api/posts/${first.id}/like`, {
      method: "DELETE",
    });
    log("unlike a post", unlike.status === 200 && unlike.data?.liked === false);

    const clientId = `smoke${Date.now()}`;
    const comment = await request(`/api/posts/${first.id}/comments`, {
      method: "POST",
      body: JSON.stringify({ clientId, body: "smoke test comment" }),
    });
    log(
      "comment with a client id",
      comment.status === 201 && comment.data?.comment?.id === clientId,
    );

    const commentReplay = await request(`/api/posts/${first.id}/comments`, {
      method: "POST",
      body: JSON.stringify({ clientId, body: "smoke test comment" }),
    });
    log(
      "comment replay is idempotent",
      commentReplay.status === 200 &&
        commentReplay.data?.comment?.id === clientId,
    );

    const removeComment = await request(`/api/comments/${clientId}`, {
      method: "DELETE",
    });
    log("delete own comment", removeComment.status === 200);
  }

  const profile = await request("/api/users/kai");
  log(
    "public profile",
    profile.status === 200 && profile.data?.user?.username === "kai",
  );

  const follow = await request("/api/users/milo/follow", { method: "POST" });
  log("follow", follow.status === 200 && follow.data?.following === true);
  const unfollow = await request("/api/users/milo/follow", { method: "DELETE" });
  log("unfollow", unfollow.status === 200 && unfollow.data?.following === false);

  const notifications = await request("/api/notifications");
  log(
    "notifications",
    notifications.status === 200 &&
      typeof notifications.data?.unreadCount === "number",
    `${notifications.data?.unreadCount ?? 0} unread`,
  );

  const search = await request("/api/search?q=rooftop");
  log(
    "search",
    search.status === 200 && Array.isArray(search.data?.posts),
    `${search.data?.posts?.length ?? 0} posts`,
  );

  const suggestions = await request("/api/suggestions");
  log("suggestions", suggestions.status === 200);

  const uploadForm = new FormData();
  uploadForm.append(
    "file",
    new Blob([tinyPng()], { type: "image/png" }),
    "smoke.png",
  );
  uploadForm.append("kind", "post");
  const upload = await request("/api/uploads", {
    method: "POST",
    body: uploadForm,
  });
  log(
    "image upload + sharp resize",
    upload.status === 200 && String(upload.data?.url).includes("/uploads/"),
    upload.data?.width ? `${upload.data.width}×${upload.data.height}` : "",
  );

  const logout = await request("/api/auth/logout", { method: "POST" });
  log("logout", logout.status === 200);

  const afterLogout = await request("/api/auth/session");
  log("session cleared", afterLogout.data?.user === null);

  console.log(
    failures === 0
      ? "\nAll smoke checks passed.\n"
      : `\n${failures} smoke check(s) failed.\n`,
  );
  process.exitCode = failures === 0 ? 0 : 1;
}

function tinyPng() {
  // 1×1 transparent PNG
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    "base64",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
