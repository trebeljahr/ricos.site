import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ListmonkSubscriber, SubscriptionStatus } from "./listmonk";
import { IMPORTED_VAR, type MailgunMember, tagImported } from "./mailgunAudience";
import { findDepartures, syncUnsubscribes } from "./syncUnsubscribes";

const LIST = "hi@newsletter.trebeljahr.com";
const LIVE = 15;
const TAG = { [IMPORTED_VAR]: "2026-10-01T09:00:00.000Z" };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

type Suppressions = Partial<Record<"bounces" | "complaints" | "unsubscribes", string[]>>;

/**
 * Mailgun and ListMonk behind one fetch mock, with state, so a second run
 * sees what the first one wrote.
 */
function fakeBackends(opts: {
  members: MailgunMember[];
  suppressions?: Suppressions;
  subscribers: Array<{ email: string; status?: SubscriptionStatus; blocklisted?: boolean }>;
  listName?: string;
  failListmonkWrites?: boolean;
}) {
  const members = opts.members.map((m) => ({ ...m, vars: { ...m.vars } }));
  const subscribers: ListmonkSubscriber[] = opts.subscribers.map((s, i) => ({
    id: 100 + i,
    uuid: `uuid-${i}`,
    email: s.email,
    name: s.email,
    status: s.blocklisted ? "blocklisted" : "enabled",
    lists: [
      // Another project's list on the shared instance.
      { id: 3, uuid: "other", name: "hatchkit", subscription_status: "confirmed" },
      ...(s.status
        ? [{ id: LIVE, uuid: "live", name: "ricos.site", subscription_status: s.status }]
        : []),
    ],
  }));
  const writes: Array<{ method: string; url: string; body: unknown }> = [];

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? "GET";

    if (url.origin === "https://api.eu.mailgun.net") {
      const path = decodeURIComponent(url.pathname);
      if (method === "GET" && path === `/v3/lists/${LIST}/members/pages`) {
        // Two pages: the loop stops on the empty one.
        return jsonResponse(
          url.searchParams.has("page")
            ? { items: [] }
            : { items: members, paging: { next: `${url.href}&page=2` } },
        );
      }
      const kind = path.match(/^\/v3\/newsletter\.trebeljahr\.com\/(\w+)$/)?.[1];
      if (method === "GET" && kind) {
        const addresses = opts.suppressions?.[kind as keyof Suppressions] ?? [];
        return jsonResponse({ items: addresses.map((address) => ({ address })) });
      }
      const memberAddress = path.match(new RegExp(`^/v3/lists/${LIST}/members/(.+)$`))?.[1];
      if (method === "PUT" && memberAddress) {
        const vars = JSON.parse((init?.body as FormData).get("vars") as string);
        writes.push({ method, url: `mailgun ${memberAddress}`, body: vars });
        const member = members.find((m) => m.address === memberAddress);
        if (!member) return new Response("not found", { status: 404 });
        member.vars = vars;
        return jsonResponse({ message: "Mailing list member has been updated" });
      }
    }

    if (url.origin === "https://listmonk.test") {
      if (method === "GET" && url.pathname === `/api/lists/${LIVE}`) {
        return jsonResponse({
          data: { id: LIVE, name: opts.listName ?? "ricos.site", optin: "double" },
        });
      }
      if (method === "GET" && url.pathname === "/api/subscribers") {
        const search = new RegExp(url.searchParams.get("search") as string, "i");
        return jsonResponse({
          data: { results: subscribers.filter((s) => search.test(s.email)), total: 0 },
        });
      }
      if (method === "PUT" && url.pathname === "/api/subscribers/lists") {
        const body = JSON.parse(init?.body as string);
        writes.push({ method, url: "listmonk /api/subscribers/lists", body });
        if (opts.failListmonkWrites) return new Response("boom", { status: 500 });
        for (const sub of subscribers.filter((s) => body.ids.includes(s.id))) {
          for (const l of sub.lists ?? []) {
            if (body.target_list_ids.includes(l.id)) l.subscription_status = "unsubscribed";
          }
        }
        return jsonResponse({ data: true });
      }
    }

    throw new Error(`unexpected ${method} ${url.href}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return { writes, members, subscribers };
}

function logs() {
  const lines: string[] = [];
  return { lines, log: (line: string) => lines.push(line) };
}

const statusOn = (sub: ListmonkSubscriber, listId: number) =>
  sub.lists?.find((l) => l.id === listId)?.subscription_status;

beforeEach(() => {
  process.env.MAILGUN_API_KEY = "mg-key";
  process.env.LISTMONK_URL = "https://listmonk.test";
  process.env.LISTMONK_API_USER = "api-user";
  process.env.LISTMONK_API_TOKEN = "api-token";
  process.env.LISTMONK_LIVE_LIST_ID = String(LIVE);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("findDepartures", () => {
  it("picks tagged members that left the list or got suppressed, nothing else", () => {
    const members: MailgunMember[] = [
      { address: "left@example.com", subscribed: false, vars: { hash: "h1", ...TAG } },
      { address: "Complained@Example.com", subscribed: true, vars: { hash: "h2", ...TAG } },
      { address: "still@example.com", subscribed: true, vars: { hash: "h3", ...TAG } },
      // Never confirmed on Mailgun: signups start out `subscribed: no`.
      { address: "pending@example.com", subscribed: false, vars: { hash: "h4" } },
      { address: "pending-bounced@example.com", subscribed: false, vars: {} },
    ];
    const suppressed = new Map([
      ["complained@example.com", ["complaints" as const]],
      ["pending-bounced@example.com", ["bounces" as const]],
    ]);

    expect(
      findDepartures(members, suppressed).map(({ email, reasons }) => ({ email, reasons })),
    ).toEqual([
      { email: "complained@example.com", reasons: ["complaints"] },
      { email: "left@example.com", reasons: ["list"] },
    ]);
  });
});

describe("syncUnsubscribes", () => {
  const scenario = () => ({
    members: [
      { address: "left@example.com", subscribed: false, vars: { hash: "h1", ...TAG } },
      { address: "complained@example.com", subscribed: true, vars: { hash: "h2", ...TAG } },
      { address: "gone-both@example.com", subscribed: false, vars: { hash: "h3", ...TAG } },
      { address: "still@example.com", subscribed: true, vars: { hash: "h4", ...TAG } },
      { address: "pending@example.com", subscribed: false, vars: { hash: "h5" } },
    ],
    suppressions: { complaints: ["complained@example.com"] },
    subscribers: [
      { email: "left@example.com", status: "confirmed" as const },
      { email: "complained@example.com", status: "confirmed" as const },
      // Already clicked the ListMonk unsubscribe link too.
      { email: "gone-both@example.com", status: "unsubscribed" as const },
      { email: "still@example.com", status: "confirmed" as const },
      // Signed up under Mailgun, confirmed on ListMonk after the cutover.
      { email: "pending@example.com", status: "confirmed" as const },
    ],
  });

  it("writes nothing on a dry run and masks every address", async () => {
    const backend = fakeBackends(scenario());
    const { lines, log } = logs();

    const report = await syncUnsubscribes({ apply: false, log });

    expect(backend.writes).toEqual([]);
    expect(report.applied).toBe(false);
    expect(report.toUnsubscribe.map((d) => d.email)).toEqual([
      "complained@example.com",
      "left@example.com",
    ]);
    const output = lines.join("\n");
    expect(output).not.toMatch(/[a-z-]+@example\.com/);
    expect(output).toContain("c***@e***.com (complaints)");
    expect(output).toContain("l***@e***.com (list)");
    expect(output).toContain("Dry run");
  });

  it("unsubscribes the confirmed departures from the live list only, then clears their tags", async () => {
    const backend = fakeBackends(scenario());

    await syncUnsubscribes({ apply: true, log: () => {} });

    const byEmail = (email: string) =>
      backend.subscribers.find((s) => s.email === email) as ListmonkSubscriber;
    expect(backend.writes[0]).toEqual({
      method: "PUT",
      url: "listmonk /api/subscribers/lists",
      body: {
        ids: [byEmail("complained@example.com").id, byEmail("left@example.com").id],
        action: "unsubscribe",
        target_list_ids: [LIVE],
      },
    });
    expect(statusOn(byEmail("left@example.com"), LIVE)).toBe("unsubscribed");
    expect(statusOn(byEmail("left@example.com"), 3)).toBe("confirmed");
    expect(statusOn(byEmail("still@example.com"), LIVE)).toBe("confirmed");
    expect(statusOn(byEmail("pending@example.com"), LIVE)).toBe("confirmed");

    // Tag cleared on all three departures, the confirm hash kept.
    expect(backend.writes.slice(1)).toEqual([
      { method: "PUT", url: "mailgun complained@example.com", body: { hash: "h2" } },
      { method: "PUT", url: "mailgun gone-both@example.com", body: { hash: "h3" } },
      { method: "PUT", url: "mailgun left@example.com", body: { hash: "h1" } },
    ]);
  });

  it("finds nothing on a second run, even after a departed reader signs up again", async () => {
    const backend = fakeBackends(scenario());
    await syncUnsubscribes({ apply: true, log: () => {} });
    const firstRunWrites = backend.writes.length;

    // `left` signs up again through the ListMonk form and confirms.
    const left = backend.subscribers.find((s) => s.email === "left@example.com");
    const membership = left?.lists?.find((l) => l.id === LIVE);
    if (membership) membership.subscription_status = "confirmed";

    const report = await syncUnsubscribes({ apply: true, log: () => {} });

    expect(report.departures).toEqual([]);
    expect(backend.writes.length).toBe(firstRunWrites);
    expect(statusOn(left as ListmonkSubscriber, LIVE)).toBe("confirmed");
  });

  it("keeps the tags when ListMonk refuses the write, so the next run retries", async () => {
    const backend = fakeBackends({ ...scenario(), failListmonkWrites: true });

    await expect(syncUnsubscribes({ apply: true, log: () => {} })).rejects.toThrow(/500 boom/);

    expect(backend.writes.map((w) => w.url)).toEqual(["listmonk /api/subscribers/lists"]);
    expect(backend.members.filter((m) => m.vars?.[IMPORTED_VAR]).length).toBe(4);
  });

  it("skips the ListMonk write when every departure is already off the list", async () => {
    const backend = fakeBackends({
      members: [{ address: "left@example.com", subscribed: false, vars: { ...TAG } }],
      subscribers: [],
    });

    const report = await syncUnsubscribes({ apply: true, log: () => {} });

    expect(report.toUnsubscribe).toEqual([]);
    expect(backend.writes).toEqual([{ method: "PUT", url: "mailgun left@example.com", body: {} }]);
  });

  it("refuses a test list as the live list", async () => {
    const backend = fakeBackends({ ...scenario(), listName: "ricos.site-test" });

    await expect(syncUnsubscribes({ apply: true, log: () => {} })).rejects.toThrow(
      /test list "ricos.site-test"/,
    );
    expect(backend.writes).toEqual([]);
  });
});

describe("tagImported", () => {
  it("adds the tag next to the existing vars, with the address quoted in the path", async () => {
    const backend = fakeBackends({
      members: [{ address: "reader+news@example.com", subscribed: true, vars: { hash: "h" } }],
      subscribers: [],
    });

    await tagImported(
      { address: "reader+news@example.com", subscribed: true, vars: { hash: "h" } },
      new Date("2026-10-01T09:00:00Z"),
    );

    expect(backend.writes).toEqual([
      {
        method: "PUT",
        url: "mailgun reader+news@example.com",
        body: { hash: "h", [IMPORTED_VAR]: "2026-10-01T09:00:00.000Z" },
      },
    ]);
    const [input] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(input)).toContain("/members/reader%2Bnews%40example.com");
  });
});
