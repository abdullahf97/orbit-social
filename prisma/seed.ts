import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { put } from "@vercel/blob";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/server/password";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env first.");
}

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

// ---------------------------------------------------------------------------
// Deterministic randomness so every seed run produces the same gallery.
// ---------------------------------------------------------------------------
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PALETTES = [
  { from: "#1a1030", to: "#3a1b4a", shapes: ["#ff6b4a", "#ffb86b", "#f6e7d3"], ring: "#ffd9a0" },
  { from: "#0c1b24", to: "#123845", shapes: ["#58c4b7", "#9be3d7", "#f2f5e9"], ring: "#a9f0e2" },
  { from: "#241009", to: "#4a1f10", shapes: ["#ff8a5c", "#ffc48a", "#ffe9d6"], ring: "#ffb27a" },
  { from: "#101024", to: "#232048", shapes: ["#8f8cff", "#c3b9ff", "#f0edff"], ring: "#d6ceff" },
  { from: "#1c1410", to: "#3b2a1c", shapes: ["#e0a96d", "#f2cf9a", "#fff3df"], ring: "#ffd9a0" },
  { from: "#101c14", to: "#1e3a26", shapes: ["#7fd18f", "#b7e6b0", "#eef7e4"], ring: "#c9f0b8" },
];

async function artwork(seed: number, width: number, height: number) {
  const random = mulberry32(seed);
  const palette = PALETTES[seed % PALETTES.length]!;

  const blobs = Array.from({ length: 4 }, (_, index) => {
    const cx = Math.round(random() * width);
    const cy = Math.round(random() * height);
    const radius = Math.round(width * (0.16 + random() * 0.34));
    const fill = palette.shapes[index % palette.shapes.length]!;
    const opacity = (0.3 + random() * 0.45).toFixed(2);
    return `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${fill}" opacity="${opacity}"/>`;
  }).join("");

  const ringRadius = Math.round(width * (0.24 + random() * 0.2));
  const ringWidth = Math.max(1, Math.round(width * 0.0035));

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${palette.from}"/>
          <stop offset="100%" stop-color="${palette.to}"/>
        </linearGradient>
        <filter id="soften" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="${Math.round(width * 0.055)}"/>
        </filter>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch"/>
          <feColorMatrix type="saturate" values="0"/>
          <feComponentTransfer><feFuncA type="linear" slope="0.55"/></feComponentTransfer>
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <g filter="url(#soften)">${blobs}</g>
      <circle cx="${width / 2}" cy="${height / 2}" r="${ringRadius}" fill="none"
        stroke="${palette.ring}" stroke-width="${ringWidth}" opacity="0.5"/>
      <rect width="100%" height="100%" filter="url(#grain)" opacity="0.12"/>
    </svg>`;

  return sharp(Buffer.from(svg)).webp({ quality: 84 }).toBuffer();
}

async function storeImage(folder: string, name: string, buffer: Buffer) {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`seed/${folder}/${name}.webp`, buffer, {
      access: "public",
      contentType: "image/webp",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
    });
    return blob.url;
  }

  const dir = path.join(process.cwd(), "public", "uploads", "seed", folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${name}.webp`), buffer);
  return `/uploads/seed/${folder}/${name}.webp`;
}

const SEED_USERS = [
  {
    username: "nova",
    name: "Nova Rahman",
    email: "nova@orbit.app",
    bio: "Designing quiet interfaces. Taking photos of rooftops.",
  },
  {
    username: "kai",
    name: "Kai Nakamura",
    email: "kai@orbit.app",
    bio: "Film at golden hour. Coffee before that.",
  },
  {
    username: "lena",
    name: "Lena Fischer",
    email: "lena@orbit.app",
    bio: "Type nerd. Plant hoarder. Berlin.",
  },
  {
    username: "omar",
    name: "Omar Haddad",
    email: "omar@orbit.app",
    bio: "Coffee, code, long walks with a camera.",
  },
  {
    username: "priya",
    name: "Priya Nair",
    email: "priya@orbit.app",
    bio: "Building tiny tools for slow mornings.",
  },
  {
    username: "theo",
    name: "Theo Martins",
    email: "theo@orbit.app",
    bio: "Sound and pixels. Occasionally both.",
  },
  {
    username: "sana",
    name: "Sana Iqbal",
    email: "sana@orbit.app",
    bio: "Karachi → everywhere. Bookstores and balconies.",
  },
  {
    username: "milo",
    name: "Milo Chen",
    email: "milo@orbit.app",
    bio: "Weekend ceramicist. Weekday product person.",
  },
];

const SEED_POSTS: Array<{
  author: string;
  caption: string;
  width: number;
  height: number;
}> = [
  { author: "nova", caption: "rooftop light, 6:42pm. stayed until the sky went quiet.", width: 1200, height: 1500 },
  { author: "kai", caption: "first roll of the year. half of it is just the cat.", width: 1200, height: 1500 },
  { author: "lena", caption: "found a bookshop with a ladder and no wifi. stayed three hours.", width: 1400, height: 1050 },
  { author: "omar", caption: "the good corner seat, before the morning rush.", width: 1200, height: 1500 },
  { author: "priya", caption: "shipping a tiny thing today: a timer that only counts up.", width: 1200, height: 1200 },
  { author: "theo", caption: "recorded the rain on the studio window. kept the mistakes.", width: 1400, height: 1050 },
  { author: "sana", caption: "sea breeze through a third-floor window. that's the whole post.", width: 1200, height: 1500 },
  { author: "milo", caption: "glaze test #14. finally not muddy.", width: 1200, height: 1200 },
  { author: "nova", caption: "sunday reset: clean desk, one plant, no notifications.", width: 1400, height: 1050 },
  { author: "kai", caption: "walked past this wall four times before noticing the shadow.", width: 1200, height: 1500 },
  { author: "lena", caption: "letter spacing is a love language.", width: 1200, height: 1200 },
  { author: "omar", caption: "commute home, slightly out of focus, exactly right.", width: 1200, height: 1500 },
  { author: "priya", caption: "prototype #3. the button feels good now.", width: 1200, height: 1200 },
  { author: "theo", caption: "an old synth, a borrowed cable, one very patient neighbour.", width: 1400, height: 1050 },
  { author: "sana", caption: "balcony tomatoes: 6. balcony pigeons: many.", width: 1200, height: 1500 },
  { author: "milo", caption: "shelf number two. it leans, but it holds.", width: 1200, height: 1500 },
  { author: "nova", caption: "a week of tiny notes. mostly about light.", width: 1400, height: 1050 },
  { author: "kai", caption: "the last warm day, probably.", width: 1200, height: 1500 },
  { author: "lena", caption: "grid systems make me feel calm. that's it. that's the post.", width: 1200, height: 1200 },
  { author: "omar", caption: "night walk, no destination, good playlist.", width: 1200, height: 1500 },
];

const COMMENTS = [
  "this is such a good frame",
  "the light here is unreal",
  "okay now I want one",
  "this made me slow down for a second",
  "the colours!!",
  "I have the same mug",
  "unreasonably good",
  "saving this for later",
  "you always find the quiet corners",
  "this is the whole mood",
];

const FOLLOWS: Array<[string, string]> = [
  ["nova", "kai"],
  ["nova", "lena"],
  ["nova", "omar"],
  ["nova", "priya"],
  ["nova", "theo"],
  ["nova", "sana"],
  ["kai", "nova"],
  ["kai", "lena"],
  ["kai", "theo"],
  ["kai", "milo"],
  ["lena", "nova"],
  ["lena", "priya"],
  ["lena", "sana"],
  ["omar", "nova"],
  ["omar", "kai"],
  ["omar", "milo"],
  ["priya", "nova"],
  ["priya", "lena"],
  ["priya", "theo"],
  ["theo", "kai"],
  ["theo", "omar"],
  ["theo", "sana"],
  ["sana", "nova"],
  ["sana", "priya"],
  ["sana", "milo"],
  ["milo", "kai"],
  ["milo", "lena"],
  ["milo", "sana"],
];

async function main() {
  const password = process.env.SEED_PASSWORD ?? "orbitdemo";
  const passwordHash = await hashPassword(password);

  console.log("• clearing existing data");
  await db.notification.deleteMany();
  await db.comment.deleteMany();
  await db.like.deleteMany();
  await db.follow.deleteMany();
  await db.post.deleteMany();
  await db.session.deleteMany();
  await db.user.deleteMany();

  console.log("• generating artwork");
  const avatarUrls = new Map<string, string>();
  for (const [index, user] of SEED_USERS.entries()) {
    const buffer = await artwork(100 + index, 512, 512);
    avatarUrls.set(user.username, await storeImage("avatars", user.username, buffer));
  }

  const postImages: Array<{ url: string; thumbUrl: string; width: number; height: number }> = [];
  for (const [index, post] of SEED_POSTS.entries()) {
    const full = await artwork(200 + index, post.width, post.height);
    const thumb = await sharp(full).resize({ width: 480 }).webp({ quality: 70 }).toBuffer();
    postImages.push({
      url: await storeImage("posts", `post-${index}`, full),
      thumbUrl: await storeImage("posts", `post-${index}-thumb`, thumb),
      width: post.width,
      height: post.height,
    });
  }

  console.log("• creating users");
  const users = new Map<string, { id: string }>();
  for (const user of SEED_USERS) {
    const created = await db.user.create({
      data: {
        username: user.username,
        name: user.name,
        email: user.email,
        bio: user.bio,
        avatarUrl: avatarUrls.get(user.username) ?? null,
        passwordHash,
      },
      select: { id: true },
    });
    users.set(user.username, created);
  }

  console.log("• creating posts");
  const now = Date.now();
  const posts: Array<{ id: string; author: string; createdAt: Date }> = [];

  for (const [index, post] of SEED_POSTS.entries()) {
    const author = users.get(post.author);
    const image = postImages[index];
    if (!author || !image) continue;

    const createdAt = new Date(now - (SEED_POSTS.length - index) * 5.5 * 60 * 60 * 1000);
    const created = await db.post.create({
      data: {
        authorId: author.id,
        caption: post.caption,
        imageUrl: image.url,
        imageWidth: image.width,
        imageHeight: image.height,
        createdAt,
      },
      select: { id: true },
    });
    posts.push({ id: created.id, author: post.author, createdAt });
  }

  console.log("• wiring the follow graph");
  for (const [follower, following] of FOLLOWS) {
    const from = users.get(follower);
    const to = users.get(following);
    if (!from || !to) continue;
    await db.follow.create({
      data: { followerId: from.id, followingId: to.id },
    });
  }

  console.log("• seeding likes and comments");
  const random = mulberry32(42);
  const usernames = SEED_USERS.map((user) => user.username);

  for (const [postIndex, post] of posts.entries()) {
    const likeCount = 2 + Math.floor(random() * 5);
    const likers = new Set<string>();
    while (likers.size < likeCount) {
      const pick = usernames[Math.floor(random() * usernames.length)]!;
      likers.add(pick);
    }

    for (const liker of likers) {
      const user = users.get(liker);
      if (!user) continue;
      await db.like.create({
        data: {
          postId: post.id,
          userId: user.id,
          createdAt: new Date(post.createdAt.getTime() + 20 * 60 * 1000),
        },
      });
    }

    const commentCount = Math.floor(random() * 3);
    for (let index = 0; index < commentCount; index += 1) {
      const commenter = usernames[Math.floor(random() * usernames.length)]!;
      const user = users.get(commenter);
      if (!user) continue;
      await db.comment.create({
        data: {
          postId: post.id,
          authorId: user.id,
          body: COMMENTS[Math.floor(random() * COMMENTS.length)]!,
          createdAt: new Date(post.createdAt.getTime() + (index + 1) * 33 * 60 * 1000),
        },
      });
    }
    void postIndex;
  }

  console.log("• recomputing counters");
  const [postLikes, postComments, followerCounts, followingCounts, postCounts] =
    await Promise.all([
      db.like.groupBy({ by: ["postId"], _count: { _all: true } }),
      db.comment.groupBy({ by: ["postId"], _count: { _all: true } }),
      db.follow.groupBy({ by: ["followingId"], _count: { _all: true } }),
      db.follow.groupBy({ by: ["followerId"], _count: { _all: true } }),
      db.post.groupBy({ by: ["authorId"], _count: { _all: true } }),
    ]);

  const updates = [
    ...postLikes.map((row) =>
      db.post.update({
        where: { id: row.postId },
        data: { likeCount: row._count._all },
      }),
    ),
    ...postComments.map((row) =>
      db.post.update({
        where: { id: row.postId },
        data: { commentCount: row._count._all },
      }),
    ),
    ...followerCounts.map((row) =>
      db.user.update({
        where: { id: row.followingId },
        data: { followerCount: row._count._all },
      }),
    ),
    ...followingCounts.map((row) =>
      db.user.update({
        where: { id: row.followerId },
        data: { followingCount: row._count._all },
      }),
    ),
    ...postCounts.map((row) =>
      db.user.update({
        where: { id: row.authorId },
        data: { postCount: row._count._all },
      }),
    ),
  ];
  await db.$transaction(updates);

  console.log("• creating notifications");
  const [likes, comments, follows] = await Promise.all([
    db.like.findMany({ select: { id: true, postId: true, userId: true } }),
    db.comment.findMany({ select: { id: true, postId: true, authorId: true } }),
    db.follow.findMany({ select: { followerId: true, followingId: true } }),
  ]);

  const postAuthors = new Map(
    (await db.post.findMany({ select: { id: true, authorId: true } })).map(
      (post) => [post.id, post.authorId],
    ),
  );

  const notifications: Array<{
    recipientId: string;
    actorId: string;
    type: "LIKE" | "COMMENT" | "FOLLOW";
    postId: string | null;
    commentId: string | null;
  }> = [];

  for (const like of likes) {
    const recipientId = postAuthors.get(like.postId);
    if (recipientId && recipientId !== like.userId) {
      notifications.push({
        recipientId,
        actorId: like.userId,
        type: "LIKE",
        postId: like.postId,
        commentId: null,
      });
    }
  }

  for (const comment of comments) {
    const recipientId = postAuthors.get(comment.postId);
    if (recipientId && recipientId !== comment.authorId) {
      notifications.push({
        recipientId,
        actorId: comment.authorId,
        type: "COMMENT",
        postId: comment.postId,
        commentId: comment.id,
      });
    }
  }

  for (const follow of follows) {
    notifications.push({
      recipientId: follow.followingId,
      actorId: follow.followerId,
      type: "FOLLOW",
      postId: null,
      commentId: null,
    });
  }

  await db.notification.createMany({ data: notifications });

  const counts = {
    users: await db.user.count(),
    posts: await db.post.count(),
    likes: await db.like.count(),
    comments: await db.comment.count(),
    follows: await db.follow.count(),
    notifications: await db.notification.count(),
  };

  console.log("\n✔ Seed complete", counts);
  console.log(`\n  Demo login: nova@orbit.app / ${password}\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
