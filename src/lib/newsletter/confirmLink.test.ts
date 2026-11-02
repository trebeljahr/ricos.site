import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONFIRM_TOKEN_TTL_MS,
  confirmLink,
  mintConfirmToken,
  readConfirmLink,
  verifyConfirmToken,
} from "./confirmLink";

beforeEach(() => {
  process.env.NEWSLETTER_TOKEN_SECRET = "test-token-secret";
});

afterEach(() => {
  delete process.env.VERCEL_ENV;
  delete process.env.VERCEL_BRANCH_URL;
});

describe("signed tokens", () => {
  it("round-trips a fresh token", () => {
    expect(verifyConfirmToken(mintConfirmToken("Reader@Example.com"))).toEqual({
      ok: true,
      email: "reader@example.com",
      lists: ["live-and-learn"],
    });
  });

  it("round-trips the chosen lists", () => {
    const token = mintConfirmToken("reader@example.com", ["computer", "live-and-learn"]);
    expect(verifyConfirmToken(token)).toEqual({
      ok: true,
      email: "reader@example.com",
      lists: ["computer", "live-and-learn"],
    });
    const link = new URL(confirmLink("reader@example.com", ["computer"]));
    expect(verifyConfirmToken(link.searchParams.get("token") as string)).toMatchObject({
      lists: ["computer"],
    });
  });

  it("confirms a token minted before lists existed to Live and Learn", () => {
    // The exact shape mintConfirmToken produced until lists were added.
    const payload = Buffer.from(
      JSON.stringify({ e: "reader@example.com", x: Date.now() + 60_000 }),
    ).toString("base64url");
    const sig = createHmac("sha256", "test-token-secret").update(payload).digest("base64url");
    expect(verifyConfirmToken(`${payload}.${sig}`)).toEqual({
      ok: true,
      email: "reader@example.com",
      lists: ["live-and-learn"],
    });
  });

  it("rejects a signed token naming an unknown or empty list", () => {
    for (const l of [["listmonk-id-15"], [15], [], "computer", ["computer", "nope"]]) {
      const payload = Buffer.from(
        JSON.stringify({ e: "reader@example.com", x: Date.now() + 60_000, l }),
      ).toString("base64url");
      const sig = createHmac("sha256", "test-token-secret").update(payload).digest("base64url");
      expect(verifyConfirmToken(`${payload}.${sig}`), JSON.stringify(l)).toEqual({
        ok: false,
        reason: "malformed",
      });
    }
  });

  it("rejects a tampered signature or payload", () => {
    const token = mintConfirmToken("reader@example.com");
    const [payload, sig] = token.split(".");
    expect(verifyConfirmToken(`${payload}.${sig.slice(0, -2)}AA`)).toMatchObject({ ok: false });
    const forged = Buffer.from(JSON.stringify({ e: "victim@example.com", x: Date.now() + 1e9 }));
    expect(verifyConfirmToken(`${forged.toString("base64url")}.${sig}`)).toEqual({
      ok: false,
      reason: "bad_signature",
    });
  });

  it("rejects a token signed with another secret", () => {
    const token = mintConfirmToken("reader@example.com");
    process.env.NEWSLETTER_TOKEN_SECRET = "other-secret";
    expect(verifyConfirmToken(token)).toEqual({ ok: false, reason: "bad_signature" });
  });

  it("rejects malformed input", () => {
    expect(verifyConfirmToken("garbage")).toEqual({ ok: false, reason: "malformed" });
    expect(verifyConfirmToken("a.b.c")).toEqual({ ok: false, reason: "malformed" });
  });

  it("expires after the TTL", () => {
    const issuedAt = 1_000_000;
    const token = mintConfirmToken("reader@example.com", undefined, issuedAt);
    expect(verifyConfirmToken(token, issuedAt + CONFIRM_TOKEN_TTL_MS - 1).ok).toBe(true);
    expect(verifyConfirmToken(token, issuedAt + CONFIRM_TOKEN_TTL_MS + 1)).toEqual({
      ok: false,
      reason: "expired",
    });
  });

  it("builds links on the fixed site URL", () => {
    expect(confirmLink("reader@example.com")).toMatch(
      /^https:\/\/ricos\.site\/api\/confirm-email\?token=/,
    );
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_BRANCH_URL = "ricos-site-git-x.vercel.app";
    expect(confirmLink("reader@example.com")).toMatch(
      /^https:\/\/ricos-site-git-x\.vercel\.app\/api\/confirm-email\?token=/,
    );
  });

  it("points dev links at the port the dev server runs on", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("PORT", "");
    expect(confirmLink("reader@example.com")).toMatch(
      /^http:\/\/localhost:2222\/api\/confirm-email/,
    );
    vi.stubEnv("PORT", "51234");
    expect(confirmLink("reader@example.com")).toMatch(
      /^http:\/\/localhost:51234\/api\/confirm-email/,
    );
    vi.unstubAllEnvs();
  });
});

describe("readConfirmLink", () => {
  it("reads a token link", () => {
    const token = new URL(confirmLink("reader@example.com")).searchParams.get("token");
    expect(readConfirmLink({ token })).toEqual({
      ok: true,
      email: "reader@example.com",
      lists: ["live-and-learn"],
    });
  });

  it("rejects a query without a token, old hash links included", () => {
    const missing = { ok: false, reason: "missing" };
    expect(readConfirmLink({})).toEqual(missing);
    expect(readConfirmLink({ hash: "0".repeat(64), email: "reader@example.com" })).toEqual(missing);
  });
});
