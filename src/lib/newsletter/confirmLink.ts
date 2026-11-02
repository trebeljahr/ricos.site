import { createHmac, timingSafeEqual } from "node:crypto";
import { baseUrl } from "src/lib/urlUtils";
import { DEFAULT_LIST, isListKey, type ListKey } from "./lists";

/**
 * The link in the double-opt-in email: `/api/confirm-email?token=...`, an
 * HMAC-signed `{email, expiry, lists}`. Expires after `CONFIRM_TOKEN_TTL_MS`.
 * Tokens minted before lists existed carry no `lists` and confirm Live and
 * Learn.
 */

/**
 * Links are built from configuration, never from the request's origin. In
 * development they follow `PORT`, which `next dev` sets to its own port, so
 * a dev server on another port than 2222 gets links back to itself.
 */
export function siteUrl(): string {
  if (process.env.NODE_ENV === "development") {
    return `http://localhost:${process.env.PORT || 2222}`;
  }
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_BRANCH_URL) {
    return `https://${process.env.VERCEL_BRANCH_URL}`;
  }
  return baseUrl;
}

// ─────────────────────────────────────────────────────────────────────────────
// Signed tokens
// ─────────────────────────────────────────────────────────────────────────────

// Long enough that an email sitting in a holiday inbox still works on
// return, short enough that abandoned links stop being one click from a
// live subscription.
export const CONFIRM_TOKEN_TTL_MS = 21 * 24 * 60 * 60 * 1000;

function tokenSecret(): string {
  const secret = process.env.NEWSLETTER_TOKEN_SECRET;
  if (!secret) throw new Error("Missing NEWSLETTER_TOKEN_SECRET");
  return secret;
}

function b64urlEncode(buf: Buffer): string {
  return buf.toString("base64url");
}

function b64urlDecode(s: string): Buffer {
  return Buffer.from(s, "base64url");
}

// `l` is absent in tokens minted before lists existed.
type TokenPayload = { e: string; x: number; l?: ListKey[] };

function sign(payload: string): Buffer {
  return createHmac("sha256", tokenSecret()).update(payload).digest();
}

export function mintConfirmToken(
  email: string,
  lists: readonly ListKey[] = [DEFAULT_LIST],
  now: number = Date.now(),
): string {
  const payload: TokenPayload = {
    e: email.toLowerCase(),
    x: now + CONFIRM_TOKEN_TTL_MS,
    l: [...lists],
  };
  const payloadStr = b64urlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  return `${payloadStr}.${b64urlEncode(sign(payloadStr))}`;
}

export function confirmLink(
  email: string,
  lists: readonly ListKey[] = [DEFAULT_LIST],
  now: number = Date.now(),
): string {
  const token = mintConfirmToken(email, lists, now);
  return `${siteUrl()}/api/confirm-email?token=${encodeURIComponent(token)}`;
}

export type VerifyResult =
  | { ok: true; email: string; lists: ListKey[] }
  | { ok: false; reason: "missing" | "malformed" | "bad_signature" | "expired" };

export function verifyConfirmToken(token: string, now: number = Date.now()): VerifyResult {
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "malformed" };
  const [payloadStr, sig] = parts;

  const expected = sign(payloadStr);
  const provided = b64urlDecode(sig);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return { ok: false, reason: "bad_signature" };
  }

  let payload: TokenPayload;
  try {
    payload = JSON.parse(b64urlDecode(payloadStr).toString("utf8")) as TokenPayload;
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (typeof payload.e !== "string" || typeof payload.x !== "number") {
    return { ok: false, reason: "malformed" };
  }
  const lists = payload.l ?? [DEFAULT_LIST];
  if (!Array.isArray(lists) || lists.length === 0 || !lists.every(isListKey)) {
    return { ok: false, reason: "malformed" };
  }
  if (payload.x < now) return { ok: false, reason: "expired" };
  return { ok: true, email: payload.e, lists };
}

/** Read the token the query carries. */
export function readConfirmLink(
  query: Record<string, unknown>,
  now: number = Date.now(),
): VerifyResult {
  if (typeof query.token !== "string") return { ok: false, reason: "missing" };
  return verifyConfirmToken(query.token, now);
}
