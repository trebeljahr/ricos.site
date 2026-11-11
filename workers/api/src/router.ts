// ricos-site-api: the part of ricos.site that is not a static file.
// Cloudflare sends it one path prefix, by route:
//
//   ricos.site/api/*  newsletter signup and confirm, /api/quote,
//                     /api/random-photo, /api/emergency, and old /api/img
//                     links (redirected to the CDN)
//
// Everything else on the host is the static export, served by the assets
// Worker `ricos-site-client` without running any code. Each request here
// counts toward the account's Workers request quota; static files do not.
//
// The same handlers exist as Next API routes under src/pages/api for
// `next dev`; both call the shared code in src/lib. The entry module
// (index.ts) may export handlers only, so the router lives here.

import { readConfirmLink } from "../../../src/lib/newsletter/confirmLink";
import { availableListKeys, parseListKeys, successPath } from "../../../src/lib/newsletter/lists";
import { isRicoOrigin } from "../../../src/lib/newsletter/ricoOrigins";
import { processSignup } from "../../../src/lib/newsletter/signupRequest";
import { confirmAddress } from "../../../src/lib/newsletter/subscribe";
import { SECURITY_HEADERS } from "../../../src/scripts/static/routing.mjs";

export type RandomQuote = { content: string; author: string };
export type RandomPhoto = { src: string; tripName: string };

/** Bundled at build time (src/scripts/static/buildApiWorkerData.ts). */
export type ApiData = {
  quotes: RandomQuote[];
  photos: RandomPhoto[];
  /** Source of src/content/email-templates/confirmSubscription.hbs. */
  confirmTemplate: string;
};

/** Cloudflare's rate-limit binding (wrangler.jsonc `ratelimits`). */
export type RateLimit = { limit(options: { key: string }): Promise<{ success: boolean }> };

export interface Env {
  /** Five signup posts per minute per client address, across isolates. */
  SIGNUP_LIMITER?: RateLimit;
  // SITE_URL (a var), the LISTMONK_* settings, NEWSLETTER_TOKEN_SECRET,
  // EMERGENCY_PASSWORD and the three phone numbers (secrets) reach the
  // shared code through process.env (nodejs_compat).
}

/** Where old /api/img/<key> links now live. */
const IMAGE_CDN = "https://assets.ricos.site";

function json(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return Response.json(body, { status, headers });
}

function methodNotAllowed(allow: string, body: Record<string, string>): Response {
  return json(body, 405, { Allow: allow });
}

/** A relative redirect, as Next's `res.redirect` sends (307). */
function redirect(location: string, status = 307): Response {
  return new Response(null, { status, headers: { Location: location } });
}

/** The visitor's address. Cloudflare always sets CF-Connecting-IP. */
function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/** The body as Next's API body parser reads it: JSON, form fields, or nothing. */
async function readBody(request: Request): Promise<unknown> {
  const type = request.headers.get("content-type") ?? "";
  try {
    if (type.includes("application/json")) return await request.json();
    if (type.includes("application/x-www-form-urlencoded")) {
      return Object.fromEntries(new URLSearchParams(await request.text()));
    }
  } catch {
    // Unparseable: treated like an empty body, so the address check answers.
  }
  return {};
}

function pick<T>(items: readonly T[]): T | undefined {
  return items[Math.floor(Math.random() * items.length)];
}

/** The site's browser-hardening headers, which `_headers` gives every static file. */
export function withSecurityHeaders(response: Response): Response {
  // A copy: the headers of a fetched or redirect response may be immutable.
  const out = new Response(response.body, response);
  for (const { key, value } of SECURITY_HEADERS) out.headers.set(key, value);
  return out;
}

async function signup(request: Request, env: Env, data: ApiData): Promise<Response> {
  if (request.method !== "POST") return methodNotAllowed("POST", { error: "Method not allowed" });
  const body = (await readBody(request)) as { lists?: unknown };
  const { status, body: answer } = await processSignup(
    {
      ip: clientIp(request),
      body,
      confirmTemplate: data.confirmTemplate,
      rateLimit: rateLimiter(env),
    },
    parseListKeys(body?.lists),
  );
  return json(answer, status);
}

/** Signup for the announce list only, open to Rico's other sites (see src/pages/api/announce-signup.ts). */
async function announceSignup(request: Request, env: Env, data: ApiData): Promise<Response> {
  const origin = request.headers.get("origin") ?? undefined;
  const headers = new Headers({ Vary: "Origin" });
  if (origin !== undefined) {
    if (!isRicoOrigin(origin, new URL(request.url).host)) {
      return json({ error: "Origin not allowed" }, 403, headers);
    }
    headers.set("Access-Control-Allow-Origin", origin);
  }
  if (request.method === "OPTIONS") {
    headers.set("Access-Control-Allow-Methods", "POST");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
    headers.set("Access-Control-Max-Age", "86400");
    return new Response(null, { status: 204, headers });
  }
  if (request.method !== "POST") {
    headers.set("Allow", "POST, OPTIONS");
    return json({ error: "Method not allowed" }, 405, headers);
  }
  if (!availableListKeys().includes("announce")) {
    return json(
      {
        error: "List closed",
        errorMessage: "This list is not open yet. Please try again later.",
      },
      503,
      headers,
    );
  }
  const { status, body } = await processSignup(
    {
      ip: clientIp(request),
      body: await readBody(request),
      confirmTemplate: data.confirmTemplate,
      rateLimit: rateLimiter(env),
    },
    ["announce"],
  );
  return json(body, status, headers);
}

async function confirmEmail(url: URL): Promise<Response> {
  try {
    const link = readConfirmLink(Object.fromEntries(url.searchParams));
    if (!link.ok) {
      console.info(
        JSON.stringify({ scope: "newsletter.confirm", event: "rejected", reason: link.reason }),
      );
      return redirect("/email-signup-error");
    }
    await confirmAddress(link.email, link.lists);
    return redirect(successPath(link.lists));
  } catch (err) {
    console.error(err);
    return redirect("/email-signup-error");
  }
}

function rateLimiter(env: Env) {
  const limiter = env.SIGNUP_LIMITER;
  if (!limiter) return undefined;
  return async (ip: string) => (await limiter.limit({ key: ip })).success;
}

function emergency(request: Request): Response {
  if (request.method !== "GET") return json({ error: "Method Not Allowed" }, 405);
  const password = request.headers.get("x-emergency-password");
  if (!password) return json({ error: "Password is required" }, 400);
  const expected = process.env.EMERGENCY_PASSWORD;
  if (!expected || password !== expected) return json({ error: "Unauthorized" }, 401);
  return json({
    importantNumbers: {
      marc: process.env.MARCS_PHONE_NUMBER,
      mum: process.env.KATRINS_PHONE_NUMBER,
      dad: process.env.HOLGERS_PHONE_NUMBER,
    },
  });
}

function randomItem<T>(request: Request, items: readonly T[], none: string): Response {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return methodNotAllowed("GET", { message: "Method not allowed" });
  }
  const item = pick(items);
  if (!item) return json({ message: none }, 404);
  return json(item, 200, { "Cache-Control": "no-store" });
}

export async function handleRequest(request: Request, env: Env, data: ApiData): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  switch (path) {
    case "/api/signup":
      return signup(request, env, data);
    case "/api/announce-signup":
      return announceSignup(request, env, data);
    case "/api/confirm-email":
      return confirmEmail(url);
    case "/api/emergency":
      return emergency(request);
    case "/api/quote":
      return randomItem(request, data.quotes, "No quotes");
    case "/api/random-photo":
      return randomItem(request, data.photos, "No photos");
  }

  // The site's pages linked resized images as /api/img/<key>/<width>.webp
  // until the image CDN; the same key is a file on assets.ricos.site.
  if (url.pathname.startsWith("/api/img/")) {
    return Response.redirect(`${IMAGE_CDN}${url.pathname.slice("/api/img".length)}`, 301);
  }

  return json({ error: "Not found." }, 404);
}
