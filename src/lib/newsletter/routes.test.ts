import type { NextApiRequest, NextApiResponse } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Tests for src/pages/api/{signup,announce-signup,confirm-email}.ts. They
// live here because every file under src/pages becomes a route.

const mailgun = vi.hoisted(() => ({
  activateEmailListMember: vi.fn(async (_email: string) => {}),
  addNewMemberToEmailList: vi.fn(async (_member: unknown) => {}),
  isAlreadySubscribed: vi.fn(async (_email: string) => false),
  sendEmail: vi.fn(async (_data: unknown) => {}),
}));
vi.mock("src/lib/mailgun", () => mailgun);

const listmonk = vi.hoisted(() => ({
  confirmSubscription: vi.fn(async (_email: string, _listId?: number) => {}),
  findSubscriber: vi.fn(async (_email: string): Promise<{ status: string } | null> => null),
  isConfirmedOnList: vi.fn(async (_email: string, _listId?: number) => false),
  sendTransactional: vi.fn(async (_params: unknown) => {}),
}));
vi.mock("src/lib/newsletter/listmonk", () => listmonk);

import announceHandler from "src/pages/api/announce-signup";
import confirmHandler from "src/pages/api/confirm-email";
import signupHandler from "src/pages/api/signup";
import { confirmLink, getLegacyHash } from "./confirmLink";
import { _resetRateLimit } from "./subscribe";

type Captured = {
  status: number;
  body?: unknown;
  redirect?: string;
  headers: Record<string, string>;
};

function call(
  handler: (req: NextApiRequest, res: NextApiResponse) => unknown,
  req: Partial<NextApiRequest>,
): Promise<Captured> {
  return new Promise((resolve) => {
    const out: Captured = { status: 200, headers: {} };
    const res = {
      setHeader(name: string, value: string) {
        out.headers[name.toLowerCase()] = value;
        return res;
      },
      end() {
        resolve(out);
        return res;
      },
      status(code: number) {
        out.status = code;
        return res;
      },
      json(body: unknown) {
        out.body = body;
        resolve(out);
        return res;
      },
      redirect(url: string) {
        out.status = 307;
        out.redirect = url;
        resolve(out);
        return res;
      },
    };
    void handler(
      {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.9" },
        query: {},
        body: {},
        socket: {} as NextApiRequest["socket"],
        ...req,
      } as NextApiRequest,
      res as unknown as NextApiResponse,
    );
  });
}

beforeEach(() => {
  process.env.SALT = "test-salt";
  process.env.NEWSLETTER_TOKEN_SECRET = "test-token-secret";
  delete process.env.NEWSLETTER_PROVIDER;
  process.env.LISTMONK_LIST_ID = "15";
  delete process.env.LISTMONK_COMPUTER_LIST_ID;
  delete process.env.LISTMONK_ANNOUNCE_LIST_ID;
  for (const mock of [...Object.values(mailgun), ...Object.values(listmonk)]) mock.mockClear();
  _resetRateLimit();
});

describe("POST /api/signup", () => {
  it("answers a blocklisted address like any other and mails nothing", async () => {
    listmonk.findSubscriber.mockResolvedValueOnce({ status: "blocklisted" });
    const res = await call(signupHandler, { body: { email: "reader@example.com" } });
    expect(res.body).toEqual({ success: "Now check your mail to confirm your subscription!" });
    expect(listmonk.sendTransactional).not.toHaveBeenCalled();
  });

  it("sends one confirmation for every chosen list", async () => {
    process.env.LISTMONK_COMPUTER_LIST_ID = "21";
    const res = await call(signupHandler, {
      body: { email: "reader@example.com", lists: ["live-and-learn", "computer", "computer"] },
    });
    expect(res.body).toEqual({ success: "Now check your mail to confirm your subscription!" });
    expect(listmonk.sendTransactional).toHaveBeenCalledTimes(1);
    expect(listmonk.sendTransactional.mock.calls[0][0]).toMatchObject({
      subject: "Confirm your signup to Live and Learn and How computers work: new chapters",
    });
  });

  it("only asks to confirm the lists the reader is not on yet", async () => {
    process.env.LISTMONK_COMPUTER_LIST_ID = "21";
    listmonk.isConfirmedOnList.mockImplementation(async (_email, listId) => listId === 15);
    const res = await call(signupHandler, {
      body: { email: "reader@example.com", lists: ["computer", "live-and-learn"] },
    });
    expect(res.body).toEqual({ success: "Now check your mail to confirm your subscription!" });
    expect(listmonk.sendTransactional.mock.calls[0][0]).toMatchObject({
      subject: "Confirm your signup to How computers work: new chapters",
    });

    const again = await call(signupHandler, {
      body: { email: "reader@example.com", lists: ["live-and-learn"] },
    });
    expect(again.body).toEqual({ success: "You were already signed up to the newsletter." });
    expect(listmonk.sendTransactional).toHaveBeenCalledTimes(1);
    listmonk.isConfirmedOnList.mockReset();
    listmonk.isConfirmedOnList.mockResolvedValue(false);
  });

  it("rejects list ids, unknown keys and an empty choice", async () => {
    process.env.LISTMONK_COMPUTER_LIST_ID = "21";
    for (const lists of [[15], ["15"], ["other-project"], [], "computer", null]) {
      _resetRateLimit();
      const res = await call(signupHandler, { body: { email: "reader@example.com", lists } });
      expect(res.status, JSON.stringify(lists)).toBe(400);
    }
    expect(listmonk.sendTransactional).not.toHaveBeenCalled();
  });

  it("rejects the chapter list while it has no list id", async () => {
    const res = await call(signupHandler, {
      body: { email: "reader@example.com", lists: ["computer"] },
    });
    expect(res.status).toBe(400);
    expect(listmonk.sendTransactional).not.toHaveBeenCalled();
  });

  it("rejects an invalid address", async () => {
    const res = await call(signupHandler, { body: { email: "not-an-address" } });
    expect(res.status).toBe(400);
    expect(listmonk.sendTransactional).not.toHaveBeenCalled();
  });

  it("answers a filled honeypot like a success and sends nothing", async () => {
    const res = await call(signupHandler, {
      body: { email: "bot@example.com", website: "http://spam.example" },
    });
    expect(res.status).toBe(200);
    expect(listmonk.findSubscriber).not.toHaveBeenCalled();
    expect(listmonk.sendTransactional).not.toHaveBeenCalled();
  });

  it("rate-limits a burst from one IP", async () => {
    for (let i = 0; i < 5; i++) {
      await call(signupHandler, { body: { email: `r${i}@example.com` } });
    }
    const res = await call(signupHandler, { body: { email: "r5@example.com" } });
    expect(res.status).toBe(429);
    expect(listmonk.sendTransactional).toHaveBeenCalledTimes(5);
  });

  it("only accepts POST", async () => {
    const res = await call(signupHandler, { method: "GET" });
    expect(res.status).toBe(405);
  });
});

describe("GET /api/confirm-email", () => {
  it("confirms a signed token link", async () => {
    const token = new URL(confirmLink("reader@example.com")).searchParams.get("token");
    const res = await call(confirmHandler, { method: "GET", query: { token: token as string } });
    expect(res.redirect).toBe("/email-signup-success");
    expect(listmonk.confirmSubscription).toHaveBeenCalledWith("reader@example.com", 15);
  });

  it("confirms each list the token names", async () => {
    process.env.LISTMONK_COMPUTER_LIST_ID = "21";
    const token = new URL(
      confirmLink("reader@example.com", ["computer", "live-and-learn"]),
    ).searchParams.get("token");
    const res = await call(confirmHandler, { method: "GET", query: { token: token as string } });
    expect(res.redirect).toBe("/email-signup-success?lists=computer,live-and-learn");
    expect(listmonk.confirmSubscription.mock.calls).toEqual([
      ["reader@example.com", 21],
      ["reader@example.com", 15],
    ]);
  });

  it("confirms the announce list and names it on the success page", async () => {
    process.env.LISTMONK_ANNOUNCE_LIST_ID = "31";
    const token = new URL(confirmLink("reader@example.com", ["announce"])).searchParams.get(
      "token",
    );
    const res = await call(confirmHandler, { method: "GET", query: { token: token as string } });
    expect(res.redirect).toBe("/email-signup-success?lists=announce");
    expect(listmonk.confirmSubscription).toHaveBeenCalledWith("reader@example.com", 31);
  });

  it("confirms a Mailgun-era hash link", async () => {
    const hash = await getLegacyHash("Reader@Example.com");
    const res = await call(confirmHandler, {
      method: "GET",
      query: { hash, email: "Reader@Example.com" },
    });
    expect(res.redirect).toBe("/email-signup-success");
    expect(listmonk.confirmSubscription).toHaveBeenCalledWith("reader@example.com", 15);
  });

  it("sends the reader to the error page when ListMonk fails", async () => {
    listmonk.confirmSubscription.mockRejectedValueOnce(new Error("down"));
    const token = new URL(confirmLink("reader@example.com")).searchParams.get("token");
    const res = await call(confirmHandler, { method: "GET", query: { token: token as string } });
    expect(res.redirect).toBe("/email-signup-error");
  });
});

describe("POST /api/announce-signup", () => {
  const post = (origin: string | undefined, body: Record<string, unknown>) =>
    call(announceHandler, {
      headers: {
        "x-forwarded-for": "203.0.113.9",
        host: "ricos.site",
        ...(origin ? { origin } : {}),
      },
      body,
    });

  beforeEach(() => {
    process.env.LISTMONK_ANNOUNCE_LIST_ID = "31";
  });

  it("signs up from another Rico site, for the announce list only", async () => {
    const res = await post("https://conv3d.trebeljahr.com", {
      email: "Reader@Example.com",
      lists: ["live-and-learn"],
      source: "conv3d",
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: "Now check your mail to confirm your subscription!" });
    expect(res.headers["access-control-allow-origin"]).toBe("https://conv3d.trebeljahr.com");
    expect(res.headers.vary).toBe("Origin");
    expect(listmonk.sendTransactional).toHaveBeenCalledTimes(1);
    const mail = listmonk.sendTransactional.mock.calls[0][0] as { subject: string; html: string };
    expect(mail.subject).toBe("Confirm your signup to New things from Rico");
    // The confirm token carries the address and the list, nothing about the site.
    const token = decodeURIComponent(mail.html.match(/token(?:=|&#x3D;)([^"&]+)/)?.[1] ?? "");
    const payload = JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString("utf8"));
    expect(Object.keys(payload).sort()).toEqual(["e", "l", "x"]);
    expect(payload.l).toEqual(["announce"]);
  });

  it("refuses other origins before reading the body", async () => {
    for (const origin of [
      "https://evil.example",
      "https://ricos.site.evil.example",
      "https://notricos.site",
      "http://trebeljahr.com",
      "https://ricos.site:8443",
      "https://someone.vercel.app",
      "null",
    ]) {
      const res = await post(origin, { email: "reader@example.com" });
      expect(res.status, origin).toBe(403);
      expect(res.headers["access-control-allow-origin"], origin).toBeUndefined();
    }
    expect(listmonk.sendTransactional).not.toHaveBeenCalled();
  });

  it("answers an allowed preflight and refuses a foreign one", async () => {
    const ok = await call(announceHandler, {
      method: "OPTIONS",
      headers: { origin: "https://playtiao.com", host: "ricos.site" },
    });
    expect(ok.status).toBe(204);
    expect(ok.headers["access-control-allow-origin"]).toBe("https://playtiao.com");
    expect(ok.headers["access-control-allow-headers"]).toBe("Content-Type");
    const bad = await call(announceHandler, {
      method: "OPTIONS",
      headers: { origin: "https://evil.example", host: "ricos.site" },
    });
    expect(bad.status).toBe(403);
  });

  it("lets a page call its own deployment, e.g. a preview or dev server", async () => {
    const res = await call(announceHandler, {
      headers: { origin: "http://localhost:51234", host: "localhost:51234" },
      body: { email: "reader@example.com" },
    });
    expect(res.status).toBe(200);
  });

  it("is closed while the announce list has no id", async () => {
    delete process.env.LISTMONK_ANNOUNCE_LIST_ID;
    const res = await post("https://ricos.site", { email: "reader@example.com" });
    expect(res.status).toBe(503);
    expect(listmonk.sendTransactional).not.toHaveBeenCalled();
  });

  it("keeps the honeypot and the rate limit", async () => {
    const bot = await post("https://ricos.site", {
      email: "bot@example.com",
      website: "http://spam.example",
    });
    expect(bot.status).toBe(200);
    expect(listmonk.sendTransactional).not.toHaveBeenCalled();
    for (let i = 0; i < 4; i++) await post(undefined, { email: `r${i}@example.com` });
    const res = await post(undefined, { email: "r5@example.com" });
    expect(res.status).toBe(429);
  });

  it("only accepts POST and OPTIONS", async () => {
    const res = await call(announceHandler, { method: "GET", headers: { host: "ricos.site" } });
    expect(res.status).toBe(405);
  });
});
