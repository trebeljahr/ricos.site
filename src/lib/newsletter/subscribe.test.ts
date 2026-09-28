import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mailgun = vi.hoisted(() => ({
  activateEmailListMember: vi.fn(async (_email: string) => {}),
  addNewMemberToEmailList: vi.fn(async (_member: unknown) => {}),
  isAlreadySubscribed: vi.fn(async (_email: string) => false),
  sendEmail: vi.fn(async (_data: unknown) => {}),
}));
vi.mock("src/lib/mailgun", () => mailgun);

const listmonk = vi.hoisted(() => ({
  confirmSubscription: vi.fn(async (_email: string) => {}),
  ensureSubscriber: vi.fn(async (_email: string) => ({})),
  isConfirmedOnList: vi.fn(async (_email: string) => false),
  sendTransactional: vi.fn(async (_params: { to: string; subject: string; html: string }) => {}),
}));
vi.mock("./listmonk", () => listmonk);

import {
  _resetRateLimit,
  checkRateLimit,
  confirmAddress,
  isAlreadySubscribed,
  newsletterProvider,
  normalizeEmail,
  sendConfirmationEmail,
} from "./subscribe";

/** Handlebars escapes `=` and `&` inside the href; mail clients decode them. */
function hrefs(html: string): string[] {
  return [...html.matchAll(/href="([^"]+)"/g)].map(([, href]) =>
    href.replace(/&#x3D;/g, "=").replace(/&amp;/g, "&"),
  );
}

beforeEach(() => {
  process.env.SALT = "test-salt";
  process.env.NEWSLETTER_TOKEN_SECRET = "test-token-secret";
  delete process.env.NEWSLETTER_PROVIDER;
  for (const mock of [...Object.values(mailgun), ...Object.values(listmonk)]) mock.mockClear();
  _resetRateLimit();
});

afterEach(() => {
  delete process.env.NEWSLETTER_PROVIDER;
});

describe("newsletterProvider", () => {
  it("stays on Mailgun until the cutover flag is set", () => {
    expect(newsletterProvider()).toBe("mailgun");
    process.env.NEWSLETTER_PROVIDER = " ListMonk ";
    expect(newsletterProvider()).toBe("listmonk");
    process.env.NEWSLETTER_PROVIDER = "sendgrid";
    expect(() => newsletterProvider()).toThrow(/Unknown NEWSLETTER_PROVIDER/);
  });
});

describe("normalizeEmail", () => {
  it("lowercases and trims a valid address", () => {
    expect(normalizeEmail("  Reader+News@Example.COM ")).toBe("reader+news@example.com");
  });

  it("rejects everything else", () => {
    for (const bad of ["", "  ", "foo", "foo@", "foo@bar", "foo @bar.com", undefined, 42, {}]) {
      expect(normalizeEmail(bad), String(bad)).toBeNull();
    }
    expect(normalizeEmail(`${"a".repeat(250)}@x.com`)).toBeNull();
  });
});

describe("with NEWSLETTER_PROVIDER=listmonk", () => {
  beforeEach(() => {
    process.env.NEWSLETTER_PROVIDER = "listmonk";
  });

  it("sends the confirmation email without adding the address to a list", async () => {
    await sendConfirmationEmail("reader@example.com");

    expect(listmonk.ensureSubscriber).toHaveBeenCalledWith("reader@example.com");
    expect(listmonk.confirmSubscription).not.toHaveBeenCalled();
    expect(listmonk.sendTransactional).toHaveBeenCalledTimes(1);
    const { to, subject, html } = listmonk.sendTransactional.mock.calls[0][0];
    expect(to).toBe("reader@example.com");
    expect(subject).toBe("Confirm Signup to the Live and Learn Newsletter");
    expect(hrefs(html)).toContainEqual(
      expect.stringMatching(/^https:\/\/ricos\.site\/api\/confirm-email\?token=[\w.-]+$/),
    );
    expect(mailgun.addNewMemberToEmailList).not.toHaveBeenCalled();
    expect(mailgun.sendEmail).not.toHaveBeenCalled();
  });

  it("confirms into ListMonk", async () => {
    await confirmAddress("reader@example.com");
    expect(listmonk.confirmSubscription).toHaveBeenCalledWith("reader@example.com");
    expect(mailgun.activateEmailListMember).not.toHaveBeenCalled();
  });

  it("asks ListMonk whether the address is already on the list", async () => {
    listmonk.isConfirmedOnList.mockResolvedValueOnce(true);
    await expect(isAlreadySubscribed("reader@example.com")).resolves.toBe(true);
    listmonk.isConfirmedOnList.mockRejectedValueOnce(new Error("down"));
    await expect(isAlreadySubscribed("reader@example.com")).resolves.toBe(false);
  });
});

describe("with the Mailgun default", () => {
  it("keeps the Mailgun flow and its hash link", async () => {
    await sendConfirmationEmail("reader@example.com");

    expect(mailgun.addNewMemberToEmailList).toHaveBeenCalledWith({
      email: "reader@example.com",
      name: "",
      vars: { hash: expect.stringMatching(/^[0-9a-f]{64}$/) },
    });
    const sent = mailgun.sendEmail.mock.calls[0][0] as { from: string; html: string };
    expect(sent.from).toBe("Rico Trebeljahr <rico@trebeljahr.com>");
    expect(hrefs(sent.html)).toContainEqual(
      expect.stringMatching(
        /^https:\/\/ricos\.site\/api\/confirm-email\?hash=[0-9a-f]{64}&email=reader%40example\.com$/,
      ),
    );
    expect(listmonk.ensureSubscriber).not.toHaveBeenCalled();
    expect(listmonk.sendTransactional).not.toHaveBeenCalled();
  });

  it("confirms into Mailgun", async () => {
    await confirmAddress("reader@example.com");
    expect(mailgun.activateEmailListMember).toHaveBeenCalledWith("reader@example.com");
    expect(listmonk.confirmSubscription).not.toHaveBeenCalled();
  });
});

describe("checkRateLimit", () => {
  it("allows five signups a minute per IP", () => {
    for (let i = 0; i < 5; i++) expect(checkRateLimit("203.0.113.1", 0)).toBe(true);
    expect(checkRateLimit("203.0.113.1", 0)).toBe(false);
    expect(checkRateLimit("203.0.113.2", 0)).toBe(true);
    expect(checkRateLimit("203.0.113.1", 60_001)).toBe(true);
  });
});
