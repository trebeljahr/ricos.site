import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const listmonk = vi.hoisted(() => ({
  confirmSubscription: vi.fn(async (_email: string, _listId?: number) => {}),
  findSubscriber: vi.fn(async (_email: string): Promise<{ status: string } | null> => null),
  isConfirmedOnList: vi.fn(async (_email: string, _listId?: number) => false),
  sendTransactional: vi.fn(async (_params: { to: string; subject: string; html: string }) => {}),
}));
vi.mock("../../../src/lib/newsletter/listmonk", () => listmonk);

import { confirmLink } from "../../../src/lib/newsletter/confirmLink";
import { _resetRateLimit } from "../../../src/lib/newsletter/subscribe";
import { type ApiData, type Env, handleRequest, withSecurityHeaders } from "./router";

const data: ApiData = {
  quotes: [{ content: "Short.", author: "Someone" }],
  photos: [{ src: "/assets/photography/lisbon-2024/a.jpg", tripName: "lisbon" }],
  confirmTemplate: '<h1>{{heading}}</h1><p>{{intro}}</p><a href="{{confirmLink}}">go</a>',
};

const SITE = "https://ricos.site";

function req(path: string, init: RequestInit & { ip?: string } = {}) {
  const headers = new Headers(init.headers);
  headers.set("cf-connecting-ip", init.ip ?? "203.0.113.9");
  return new Request(`${SITE}${path}`, { ...init, headers });
}

function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  return req(path, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const call = (request: Request, env: Env = {}) => handleRequest(request, env, data);

beforeEach(() => {
  process.env.NEWSLETTER_TOKEN_SECRET = "test-token-secret";
  process.env.LISTMONK_LIST_ID = "15";
  process.env.SITE_URL = SITE;
  delete process.env.LISTMONK_ANNOUNCE_LIST_ID;
  for (const mock of Object.values(listmonk)) mock.mockClear();
  _resetRateLimit();
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.SITE_URL;
});

describe("/api/signup", () => {
  it("answers the form's validation errors like the Next route", async () => {
    const res = await call(post("/api/signup", { email: "x" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "Invalid email",
      errorMessage: "Please enter a valid email address.",
    });
  });

  it("mails the confirm link from the bundled template, pointing at SITE_URL", async () => {
    const res = await call(post("/api/signup", { email: "Reader@Example.com" }));
    expect(res.status).toBe(200);
    expect(listmonk.sendTransactional).toHaveBeenCalledTimes(1);
    const { to, subject, html } = listmonk.sendTransactional.mock.calls[0][0];
    expect(to).toBe("reader@example.com");
    expect(subject).toBe("Confirm Signup to the Live and Learn Newsletter");
    expect(html).toContain("<h1>Welcome to Live and Learn.</h1>");
    expect(html).toContain(`href="${SITE}/api/confirm-email?token&#x3D;`);
  });

  it("reads form-encoded bodies too", async () => {
    const res = await call(
      req("/api/signup", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "email=reader%40example.com",
      }),
    );
    expect(res.status).toBe(200);
  });

  it("answers a filled honeypot like a success and sends nothing", async () => {
    const res = await call(post("/api/signup", { email: "bot@example.com", website: "x" }));
    expect(res.status).toBe(200);
    expect(listmonk.sendTransactional).not.toHaveBeenCalled();
  });

  it("only accepts POST", async () => {
    const res = await call(req("/api/signup"));
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("POST");
  });

  it("refuses when the rate-limit binding says so", async () => {
    const env: Env = { SIGNUP_LIMITER: { limit: async () => ({ success: false }) } };
    const res = await call(post("/api/signup", { email: "reader@example.com" }), env);
    expect(res.status).toBe(429);
    expect(listmonk.sendTransactional).not.toHaveBeenCalled();
  });
});

describe("/api/announce-signup", () => {
  it("answers a preflight from fractal.garden with CORS headers", async () => {
    const res = await call(
      req("/api/announce-signup", {
        method: "OPTIONS",
        headers: { Origin: "https://fractal.garden" },
      }),
    );
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://fractal.garden");
    expect(res.headers.get("access-control-allow-methods")).toBe("POST");
    expect(res.headers.get("access-control-allow-headers")).toBe("Content-Type");
    expect(res.headers.get("vary")).toBe("Origin");
  });

  it("refuses other origins before reading anything", async () => {
    const res = await call(
      post("/api/announce-signup", { email: "a@b.co" }, { Origin: "https://evil.example" }),
    );
    expect(res.status).toBe(403);
  });

  it("answers 503 while the announce list has no id", async () => {
    const res = await call(
      post("/api/announce-signup", { email: "a@b.co" }, { Origin: "https://fractal.garden" }),
    );
    expect(res.status).toBe(503);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://fractal.garden");
  });

  it("signs up to the announce list only", async () => {
    process.env.LISTMONK_ANNOUNCE_LIST_ID = "31";
    const res = await call(
      post("/api/announce-signup", { email: "a@b.co", lists: ["live-and-learn"] }),
    );
    expect(res.status).toBe(200);
    expect(listmonk.sendTransactional.mock.calls[0][0].subject).toBe(
      "Confirm your signup to New things from Rico",
    );
  });
});

describe("/api/confirm-email", () => {
  it("sends a bad token to the error page", async () => {
    const res = await call(req("/api/confirm-email?token=bad"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("/email-signup-error");
    expect(listmonk.confirmSubscription).not.toHaveBeenCalled();
  });

  it("confirms a signed link and sends the reader to the success page", async () => {
    const link = new URL(confirmLink("reader@example.com"));
    const res = await call(req(`${link.pathname}${link.search}`));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("/email-signup-success");
    expect(listmonk.confirmSubscription).toHaveBeenCalledWith("reader@example.com", 15);
  });
});

describe("random picks and secrets", () => {
  it("answers /api/quote and /api/random-photo from the bundled data, uncached", async () => {
    for (const [path, body] of [
      ["/api/quote", data.quotes[0]],
      ["/api/random-photo", data.photos[0]],
    ] as const) {
      const res = await call(req(path));
      expect(res.status).toBe(200);
      expect(res.headers.get("cache-control")).toBe("no-store");
      expect(await res.json()).toEqual(body);
    }
    expect((await call(req("/api/quote", { method: "POST" }))).status).toBe(405);
  });

  it("guards /api/emergency with the password", async () => {
    process.env.EMERGENCY_PASSWORD = "pw";
    process.env.MARCS_PHONE_NUMBER = "1";
    expect((await call(req("/api/emergency"))).status).toBe(400);
    expect(
      (await call(req("/api/emergency", { headers: { "x-emergency-password": "no" } }))).status,
    ).toBe(401);
    const ok = await call(req("/api/emergency", { headers: { "x-emergency-password": "pw" } }));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ importantNumbers: { marc: "1" } });
    delete process.env.EMERGENCY_PASSWORD;
    expect(
      (await call(req("/api/emergency", { headers: { "x-emergency-password": "pw" } }))).status,
    ).toBe(401);
  });
});

describe("kestrel (first-party Plausible)", () => {
  it("forwards events with the visitor's address", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      Response.json({ ok: true }, { status: 202 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const res = await call(
      req("/kestrel/k", {
        method: "POST",
        ip: "198.51.100.7",
        headers: { "content-type": "text/plain", "user-agent": "UA" },
        body: '{"n":"pageview"}',
      }),
    );
    expect(res.status).toBe(202);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://plausible.trebeljahr.com/api/event");
    expect(init?.headers).toMatchObject({
      "X-Plausible-IP": "198.51.100.7",
      "User-Agent": "UA",
      "Content-Type": "text/plain",
    });
    expect(new TextDecoder().decode(init?.body as ArrayBuffer)).toBe('{"n":"pageview"}');
  });

  it("serves the script from Plausible", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("!function(){}", {
            headers: { "content-type": "application/javascript", "set-cookie": "x=1" },
          }),
      ),
    );
    const res = await call(req("/kestrel/k.js"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/javascript");
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(await res.text()).toBe("!function(){}");
  });

  it("only accepts POST for events", async () => {
    expect((await call(req("/api/kestrel"))).status).toBe(405);
  });
});

describe("other paths", () => {
  it("sends old /api/img links to the same key on the image CDN", async () => {
    const res = await call(req("/api/img/assets/blog/photography/640.webp"));
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe(
      "https://assets.ricos.site/assets/blog/photography/640.webp",
    );
  });

  it("answers 404 for anything else", async () => {
    for (const path of ["/api/random-quote", "/api/dev/diary", "/kestrel/x"]) {
      expect((await call(req(path))).status, path).toBe(404);
    }
  });

  it("adds the site's security headers, also to redirects", async () => {
    const res = withSecurityHeaders(await call(req("/api/img/a/1.webp")));
    expect(res.headers.get("x-frame-options")).toBe("DENY");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("location")).toBe("https://assets.ricos.site/a/1.webp");
  });
});
