import type { NextApiRequest } from "next";
import { getErrorMessage } from "src/lib/utils/misc";
import { availableListKeys, DEFAULT_LIST, type ListKey, listNames } from "./lists";
import { checkRateLimit, listsToConfirm, normalizeEmail, sendConfirmationEmail } from "./subscribe";

/**
 * The part of a signup both signup routes share: /api/signup (this site's
 * forms, any list) and /api/announce-signup (other Rico sites, the
 * announce list only). The route decides which lists; this checks the
 * rate limit, the honeypot and the address, and mails the confirm link.
 *
 * Nothing about the request is kept: no page, site or referrer goes into
 * the confirm token or onto the subscriber. The IP only feeds the
 * in-memory rate limiter.
 *
 * Runtime-neutral: the Next routes (under `next dev`) and the API Worker
 * (workers/api, production) both call it with what they read off the
 * request.
 */

export type SignupResult = { status: number; body: Record<string, string> };

export type SignupInput = {
  /** The client's address, for the rate limiter only. */
  ip: string;
  /** The parsed request body (JSON or form fields). */
  body: unknown;
  /** The confirm email template; read from the checkout when absent. */
  confirmTemplate?: string;
  /**
   * Extra limiter in front of the in-memory one (the Worker's rate-limit
   * binding, which holds across isolates). `false` means over the limit.
   */
  rateLimit?: (ip: string) => Promise<boolean>;
};

export const CHECK_YOUR_MAIL = "Now check your mail to confirm your subscription!";

/** The client's address on a Node request (the Next routes). */
export function clientIp(req: NextApiRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (first) return first.split(",")[0].trim();
  const real = req.headers["x-real-ip"];
  if (typeof real === "string" && real) return real;
  return req.socket.remoteAddress ?? "unknown";
}

/** `lists` is what the route parsed; `null` means the request named none it may join. */
export async function processSignup(
  input: SignupInput,
  lists: ListKey[] | null,
): Promise<SignupResult> {
  const body = (input.body && typeof input.body === "object" ? input.body : {}) as Record<
    string,
    unknown
  >;
  if (!checkRateLimit(input.ip) || (input.rateLimit && !(await input.rateLimit(input.ip)))) {
    return {
      status: 429,
      body: {
        error: "Too many requests",
        errorMessage: "Too many signups from here. Please wait a minute.",
      },
    };
  }

  // Honeypot: people never fill the hidden field, bots do. Answer like a
  // success so they learn nothing, and send nothing.
  if (typeof body.website === "string" && body.website.trim()) {
    return { status: 200, body: { success: CHECK_YOUR_MAIL } };
  }

  const email = normalizeEmail(body.email);
  if (!email) {
    return {
      status: 400,
      body: { error: "Invalid email", errorMessage: "Please enter a valid email address." },
    };
  }

  const available = availableListKeys();
  if (!lists?.every((list) => available.includes(list))) {
    return {
      status: 400,
      body: { error: "Invalid list", errorMessage: "Pick at least one of the lists on the form." },
    };
  }

  try {
    const pending = await listsToConfirm(email, lists);
    if (pending.length === 0) {
      return {
        status: 200,
        body: {
          success:
            lists.length === 1 && lists[0] === DEFAULT_LIST
              ? "You were already signed up to the newsletter."
              : `You were already signed up to ${listNames(lists)}.`,
        },
      };
    }

    await sendConfirmationEmail(email, pending, input.confirmTemplate);
    return { status: 200, body: { success: CHECK_YOUR_MAIL } };
  } catch (err) {
    console.error(err);
    return {
      status: 500,
      body: { error: "An error occured...", errorMessage: getErrorMessage(err) },
    };
  }
}
