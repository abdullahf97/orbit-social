import { describe, expect, it } from "vitest";
import {
  commentSchema,
  emailSchema,
  loginSchema,
  postSchema,
  profileSchema,
  signupSchema,
  usernameSchema,
} from "./schemas";

describe("usernameSchema", () => {
  it("normalises case and whitespace", () => {
    expect(usernameSchema.parse("  NoVa  ")).toBe("nova");
  });

  it("rejects reserved names", () => {
    for (const reserved of ["admin", "feed", "settings", "orbit"]) {
      expect(usernameSchema.safeParse(reserved).success).toBe(false);
    }
  });

  it("rejects invalid characters and lengths", () => {
    expect(usernameSchema.safeParse("no va").success).toBe(false);
    expect(usernameSchema.safeParse("no-vá").success).toBe(false);
    expect(usernameSchema.safeParse("ab").success).toBe(false);
    expect(usernameSchema.safeParse("a".repeat(21)).success).toBe(false);
  });

  it("accepts underscores and digits", () => {
    expect(usernameSchema.parse("nova_2026")).toBe("nova_2026");
  });
});

describe("emailSchema", () => {
  it("trims and lowercases", () => {
    expect(emailSchema.parse("  NOVA@Orbit.App ")).toBe("nova@orbit.app");
  });

  it("rejects malformed addresses", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
    expect(emailSchema.safeParse("a@b").success).toBe(false);
  });
});

describe("signupSchema", () => {
  const valid = {
    name: "Nova Rahman",
    username: "nova",
    email: "nova@orbit.app",
    password: "orbitdemo",
  };

  it("accepts a valid payload", () => {
    const parsed = signupSchema.parse(valid);
    expect(parsed.username).toBe("nova");
    expect(parsed.email).toBe("nova@orbit.app");
  });

  it("rejects a short password", () => {
    const result = signupSchema.safeParse({ ...valid, password: "short" });
    expect(result.success).toBe(false);
  });

  it("rejects a blank name", () => {
    expect(signupSchema.safeParse({ ...valid, name: "   " }).success).toBe(
      false,
    );
  });
});

describe("loginSchema", () => {
  it("accepts a username or an email", () => {
    expect(
      loginSchema.safeParse({ identifier: "nova", password: "x" }).success,
    ).toBe(true);
    expect(
      loginSchema.safeParse({
        identifier: "nova@orbit.app",
        password: "x",
      }).success,
    ).toBe(true);
  });

  it("requires both fields", () => {
    expect(loginSchema.safeParse({ identifier: "", password: "x" }).success).toBe(
      false,
    );
    expect(loginSchema.safeParse({ identifier: "nova", password: "" }).success).toBe(
      false,
    );
  });
});

describe("postSchema", () => {
  it("defaults a missing caption to an empty string and trims it", () => {
    expect(postSchema.parse({})).toMatchObject({ caption: "" });
    expect(postSchema.parse({ caption: "  hello  " }).caption).toBe("hello");
  });

  it("caps the caption length", () => {
    expect(postSchema.safeParse({ caption: "x".repeat(2201) }).success).toBe(
      false,
    );
  });

  it("accepts an optional client id and image metadata", () => {
    const parsed = postSchema.parse({
      clientId: "client_123456",
      caption: "rooftop",
      imageUrl: "/uploads/posts/a.webp",
      imageWidth: 1200,
      imageHeight: 1500,
    });
    expect(parsed.imageWidth).toBe(1200);
  });

  it("rejects non-positive dimensions", () => {
    expect(
      postSchema.safeParse({ imageWidth: 0, imageHeight: 100 }).success,
    ).toBe(false);
  });
});

describe("commentSchema", () => {
  it("trims and requires a body", () => {
    expect(commentSchema.parse({ body: "  nice  " }).body).toBe("nice");
    expect(commentSchema.safeParse({ body: "   " }).success).toBe(false);
  });

  it("limits length", () => {
    expect(
      commentSchema.safeParse({ body: "x".repeat(1001) }).success,
    ).toBe(false);
  });
});

describe("profileSchema", () => {
  it("allows partial updates", () => {
    expect(profileSchema.parse({ bio: "hello" })).toEqual({ bio: "hello" });
    expect(profileSchema.parse({})).toEqual({});
  });

  it("rejects an overlong bio", () => {
    expect(profileSchema.safeParse({ bio: "x".repeat(161) }).success).toBe(
      false,
    );
  });
});
