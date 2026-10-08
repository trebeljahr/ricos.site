import { createHmac, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { baseUrl } from "src/lib/urlUtils";
import { DEFAULT_LIST, isListKey, type ListKey } from "./lists";

/**
 * The link in the double-opt-in email: `/api/confirm-email?...`.
 *
 * Two formats confirm:
 *
 *   - `?token=` — HMAC-signed `{email, expiry, lists}`, sent since the move
 *     to ListMonk. Expires after `CONFIRM_TOKEN_TTL_MS`. Tokens minted
 *     before lists existed carry no `lists` and confirm Live and Learn.
 *   - `?hash=&email=` — the Mailgun-era link: a keyed scrypt hash of the
 *     address, no expiry. Mailgun mode still sends it, and links already
 *     sitting in inboxes must keep working through the cutover. Always
 *     Live and Learn.
 */

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

function getSalt() {
  if (!process.env.SALT) throw Error("Please provide SALT in the .env file!");
  return process.env.SALT;
}

/**
 * Links are built from configuration, never from the request's origin. In
 * development they follow `PORT`, which `next dev` sets to its own port, so
 * a dev server on another port than 3713 gets links back to itself.
 */
export function siteUrl(): string {
  if (process.env.NODE_ENV === "development") {
    return `http://localhost:${process.env.PORT || 3713}`;
  }
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_BRANCH_URL) {
    return `https://${process.env.VERCEL_BRANCH_URL}`;
  }
  return baseUrl;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mailgun-era hash links
// ─────────────────────────────────────────────────────────────────────────────

// Every legacy link carries a 32-byte scrypt hash as 64 hex chars.
const HASH_BYTES = 32;
const HASH_PATTERN = new RegExp(`^[0-9a-f]{${HASH_BYTES * 2}}$`, "i");

export async function getLegacyHash(email: string): Promise<string> {
  const hash = await scrypt(email, getSalt(), HASH_BYTES);
  return hash.toString("hex");
}

export async function checkLegacyHash(email: string, hashFromUrl: string): Promise<boolean> {
  const salt = getSalt();
  // Buffer.from(hex) stops at the first non-hex char instead of failing, so
  // check the shape first or a valid hash with junk appended would pass.
  if (!HASH_PATTERN.test(hashFromUrl)) return false;

  const expected = await scrypt(email, salt, HASH_BYTES);
  const given = Buffer.from(hashFromUrl, "hex");
  if (given.length !== expected.length) return false;
  return timingSafeEqual(expected, given);
}

export async function legacyConfirmLink(email: string): Promise<string> {
  const hash = await getLegacyHash(email);
  return `${siteUrl()}/api/confirm-email?hash=${hash}&email=${encodeURIComponent(email)}`;
}

// Old links put the address into the query unencoded, so a "+" in it
// arrives as a space. Addresses can't contain bare spaces, so undo that.
export function emailFromQuery(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  return value.replace(/ /g, "+");
}

// ─────────────────────────────────────────────────────────────────────────────
// Signed tokens
// ─────────────────────────────────────────────────────────────────────────────

// Long enough that an email sitting in a holiday inbox still works on
// return, short enough that abandoned links stop being one click from a
// live subscription.
export const CONFIRM_TOKEN_TTL_MS = 21 * 24 * 60 * 60 * 1000;

function tokenSecret(): string {
  const secret = process.env.NEWSLETTER_TOKEN_SECRET || process.env.SALT;
  if (!secret) throw new Error("Missing NEWSLETTER_TOKEN_SECRET (or SALT fallback)");
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

/** Read whichever link format the query carries. */
export async function readConfirmLink(
  query: Record<string, unknown>,
  now: number = Date.now(),
): Promise<VerifyResult> {
  if (typeof query.token === "string") return verifyConfirmToken(query.token, now);

  const email = emailFromQuery(query.email);
  if (!email || typeof query.hash !== "string") return { ok: false, reason: "missing" };
  if (!(await checkLegacyHash(email, query.hash))) return { ok: false, reason: "bad_signature" };
  return { ok: true, email, lists: [DEFAULT_LIST] };
}
