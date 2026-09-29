import type { NextApiRequest, NextApiResponse } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Tests for src/pages/api/{signup,confirm-email}.ts. They live here because
// every file under src/pages becomes a route.

const mailgun = vi.hoisted(() => ({
  activateEmailListMember: vi.fn(async (_email: string) => {}),
  addNewMemberToEmailList: vi.fn(async (_member: unknown) => {}),
  isAlreadySubscribed: vi.fn(async (_email: string) => false),
  sendEmail: vi.fn(async (_data: unknown) => {}),
}));
vi.mock("src/lib/mailgun", () => mailgun);

const listmonk = vi.hoisted(() => ({
  confirmSubscription: vi.fn(async (_email: string) => {}),
  findSubscriber: vi.fn(async (_email: string): Promise<{ status: string } | null> => null),
  isConfirmedOnList: vi.fn(async (_email: string) => false),
  sendTransactional: vi.fn(async (_params: unknown) => {}),
}));
vi.mock("src/lib/newsletter/listmonk", () => listmonk);

import confirmHandler from "src/pages/api/confirm-email";
import signupHandler from "src/pages/api/signup";
import { confirmLink, getLegacyHash } from "./confirmLink";
import { _resetRateLimit } from "./subscribe";

type Captured = { status: number; body?: unknown; redirect?: string };

function call(
  handler: (req: NextApiRequest, res: NextApiResponse) => unknown,
  req: Partial<NextApiRequest>,
): Promise<Captured> {
  return new Promise((resolve) => {
    const out: Captured = { status: 200 };
    const res = {
      setHeader: () => res,
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
  for (const mock of [...Object.values(mailgun), ...Object.values(listmonk)]) mock.mockClear();
  _resetRateLimit();
});

describe("POST /api/signup", () => {
  it("sends the confirmation email for a valid address", async () => {
    const res = await call(signupHandler, { body: { email: " Reader@Example.com " } });
    expect(res.status).toBe(200);
    expect(listmonk.sendTransactional).toHaveBeenCalledTimes(1);
    expect(listmonk.sendTransactional.mock.calls[0][0]).toMatchObject({ to: "reader@example.com" });
    expect(listmonk.confirmSubscription).not.toHaveBeenCalled();
  });

  it("skips the email for a confirmed member", async () => {
    listmonk.isConfirmedOnList.mockResolvedValueOnce(true);
    const res = await call(signupHandler, { body: { email: "reader@example.com" } });
    expect(res.body).toEqual({ success: "You were already signed up to the newsletter." });
    expect(listmonk.sendTransactional).not.toHaveBeenCalled();
  });

  it("answers a blocklisted address like any other and mails nothing", async () => {
    listmonk.findSubscriber.mockResolvedValueOnce({ status: "blocklisted" });
    const res = await call(signupHandler, { body: { email: "reader@example.com" } });
    expect(res.body).toEqual({ success: "Now check your mail to confirm your subscription!" });
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
    expect(listmonk.confirmSubscription).toHaveBeenCalledWith("reader@example.com");
  });

  it("confirms a Mailgun-era hash link", async () => {
    const hash = await getLegacyHash("Reader@Example.com");
    const res = await call(confirmHandler, {
      method: "GET",
      query: { hash, email: "Reader@Example.com" },
    });
    expect(res.redirect).toBe("/email-signup-success");
    expect(listmonk.confirmSubscription).toHaveBeenCalledWith("reader@example.com");
  });

  it("does not confirm an arbitrary address with a made-up hash", async () => {
    const res = await call(confirmHandler, {
      method: "GET",
      query: { email: "victim@example.com", hash: "anything" },
    });
    expect(res.redirect).toBe("/email-signup-error");
    expect(listmonk.confirmSubscription).not.toHaveBeenCalled();
    expect(mailgun.activateEmailListMember).not.toHaveBeenCalled();
  });

  it("sends the reader to the error page when ListMonk fails", async () => {
    listmonk.confirmSubscription.mockRejectedValueOnce(new Error("down"));
    const token = new URL(confirmLink("reader@example.com")).searchParams.get("token");
    const res = await call(confirmHandler, { method: "GET", query: { token: token as string } });
    expect(res.redirect).toBe("/email-signup-error");
  });
});
