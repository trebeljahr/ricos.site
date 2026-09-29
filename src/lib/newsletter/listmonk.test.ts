import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addToList,
  confirmSubscription,
  createSuppressed,
  escapeGoTemplate,
  findSubscriber,
  isConfirmedOnList,
  resolveFromAddress,
  sendCampaign,
  sendTransactional,
  unsubscribeFromList,
} from "./listmonk";

const subscriber = {
  id: 42,
  uuid: "sub-uuid",
  email: "reader@example.com",
  name: "reader@example.com",
  status: "enabled" as const,
  lists: [
    {
      id: 16,
      uuid: "list-uuid",
      name: "ricos.site-test",
      subscription_status: "confirmed" as const,
    },
  ],
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

type FetchCall = [RequestInfo | URL, RequestInit?];

function mockFetch(...responses: Response[]) {
  const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
    jsonResponse({ data: true }),
  );
  for (const response of responses) fetchMock.mockResolvedValueOnce(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** Every request except lookups, as "METHOD /path". */
function writes(calls: FetchCall[]): string[] {
  return calls
    .filter(([, init]) => (init?.method ?? "GET") !== "GET")
    .map(([input, init]) => `${init?.method} ${new URL(input as string).pathname}`);
}

function body(call: FetchCall): unknown {
  return JSON.parse(call[1]?.body as string);
}

beforeEach(() => {
  process.env.LISTMONK_URL = "https://listmonk.test/";
  process.env.LISTMONK_API_USER = "api-user";
  process.env.LISTMONK_API_TOKEN = "api-token";
  process.env.LISTMONK_LIST_ID = "16";
  process.env.LISTMONK_TX_TEMPLATE_ID = "13";
  process.env.LISTMONK_CAMPAIGN_TEMPLATE_ID = "14";
  process.env.LISTMONK_FROM = "Rico Trebeljahr <noreply@mail.ricos.site>";
  delete process.env.LISTMONK_REPLY_TO;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("findSubscriber", () => {
  it("searches with an anchored, quoted pattern and the API token", async () => {
    const fetchMock = mockFetch(jsonResponse({ data: { results: [subscriber], total: 1 } }));

    await expect(findSubscriber("Reader@Example.com")).resolves.toEqual(subscriber);

    const [input, init] = fetchMock.mock.calls[0] as FetchCall;
    const url = new URL(input as string);
    expect(url.origin + url.pathname).toBe("https://listmonk.test/api/subscribers");
    expect(url.searchParams.get("search")).toBe("^reader@example\\.com$");
    expect(url.searchParams.get("per_page")).toBe("all");
    expect((init?.headers as Record<string, string>).Authorization).toBe(
      "token api-user:api-token",
    );
  });

  it("quotes regex characters so a plus-address matches itself", async () => {
    const fetchMock = mockFetch(jsonResponse({ data: { results: [], total: 0 } }));

    await findSubscriber("reader+test@example.com");

    const search = new URL(fetchMock.mock.calls[0][0] as string).searchParams.get("search");
    expect(search).toBe("^reader\\+test@example\\.com$");
    // Same semantics as Postgres `~*` for this pattern.
    expect(new RegExp(search as string, "i").test("reader+test@example.com")).toBe(true);
    expect(new RegExp(search as string, "i").test("readerrtest@example.com")).toBe(false);
  });

  it("exact-matches the email among the search results", async () => {
    mockFetch(
      jsonResponse({
        data: { results: [{ ...subscriber, email: "other@example.com" }], total: 1 },
      }),
    );
    await expect(findSubscriber("reader@example.com")).resolves.toBeNull();
  });

  it("throws on an API error", async () => {
    mockFetch(new Response("nope", { status: 403 }));
    await expect(findSubscriber("reader@example.com")).rejects.toThrow(/403 nope/);
  });
});

describe("isConfirmedOnList", () => {
  it("checks the status on the configured list only", async () => {
    mockFetch(jsonResponse({ data: { results: [subscriber], total: 1 } }));
    await expect(isConfirmedOnList("reader@example.com")).resolves.toBe(true);

    process.env.LISTMONK_LIST_ID = "15";
    mockFetch(jsonResponse({ data: { results: [subscriber], total: 1 } }));
    await expect(isConfirmedOnList("reader@example.com")).resolves.toBe(false);
  });
});

describe("confirmSubscription", () => {
  it("adds an existing subscriber to the list as confirmed", async () => {
    const fetchMock = mockFetch(
      jsonResponse({ data: { results: [{ ...subscriber, lists: [] }], total: 1 } }),
    );

    await confirmSubscription("reader@example.com");

    expect(writes(fetchMock.mock.calls)).toEqual(["PUT /api/subscribers/lists"]);
    expect(body(fetchMock.mock.calls[1])).toEqual({
      ids: [42],
      action: "add",
      target_list_ids: [16],
      status: "confirmed",
    });
  });

  it("creates an address new to ListMonk on the list, preconfirmed", async () => {
    const fetchMock = mockFetch(
      jsonResponse({ data: { results: [], total: 0 } }),
      jsonResponse({ data: subscriber }),
    );

    await confirmSubscription("reader@example.com", 15);

    expect(writes(fetchMock.mock.calls)).toEqual(["POST /api/subscribers"]);
    expect(body(fetchMock.mock.calls[1])).toMatchObject({
      email: "reader@example.com",
      status: "enabled",
      lists: [15],
      preconfirm_subscriptions: true,
    });
  });

  it("confirms the existing subscriber when the create loses a race (409)", async () => {
    const fetchMock = mockFetch(
      jsonResponse({ data: { results: [], total: 0 } }),
      new Response('{"message":"E-mail already exists."}', { status: 409 }),
      jsonResponse({ data: { results: [{ ...subscriber, lists: [] }], total: 1 } }),
    );

    await confirmSubscription("reader@example.com", 15);

    expect(writes(fetchMock.mock.calls)).toEqual([
      "POST /api/subscribers",
      "PUT /api/subscribers/lists",
    ]);
    expect(body(fetchMock.mock.calls[3])).toMatchObject({
      ids: [42],
      target_list_ids: [15],
      status: "confirmed",
    });
  });

  it("names the missing permission when a 409 address stays invisible", async () => {
    mockFetch(
      jsonResponse({ data: { results: [], total: 0 } }),
      new Response('{"message":"E-mail already exists."}', { status: 409 }),
      jsonResponse({ data: { results: [], total: 0 } }),
    );

    const err = await confirmSubscription("reader@example.com", 15).catch((e: Error) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/subscribers:get_all/);
    // The message goes to the Vercel logs: no address in it.
    expect((err as Error).message).not.toMatch(/reader@example\.com/);
  });

  it("does not retry other API errors", async () => {
    const fetchMock = mockFetch(
      jsonResponse({ data: { results: [], total: 0 } }),
      new Response("boom", { status: 500 }),
    );
    await expect(confirmSubscription("reader@example.com", 15)).rejects.toThrow(/500 boom/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("createSuppressed", () => {
  it("creates a bounce or complaint blocklisted, preconfirmed so ListMonk mails nothing", async () => {
    const fetchMock = mockFetch(jsonResponse({ data: subscriber }));

    await createSuppressed("Bounced@Example.com", 15, "blocklisted");

    expect(writes(fetchMock.mock.calls)).toEqual(["POST /api/subscribers"]);
    expect(body(fetchMock.mock.calls[0])).toEqual({
      email: "bounced@example.com",
      name: "bounced@example.com",
      status: "blocklisted",
      lists: [15],
      preconfirm_subscriptions: true,
    });
  });

  it("creates an unsubscribe on no list, then adds it to the list as unsubscribed", async () => {
    const fetchMock = mockFetch(jsonResponse({ data: subscriber }));

    await createSuppressed("left@example.com", 15, "unsubscribed");

    expect(writes(fetchMock.mock.calls)).toEqual([
      "POST /api/subscribers",
      "PUT /api/subscribers/lists",
    ]);
    expect(body(fetchMock.mock.calls[0])).toMatchObject({ status: "enabled", lists: [] });
    expect(body(fetchMock.mock.calls[1])).toEqual({
      ids: [42],
      action: "add",
      target_list_ids: [15],
      status: "unsubscribed",
    });
  });
});

describe("addToList", () => {
  it("sends nothing for an empty batch", async () => {
    const fetchMock = mockFetch();
    await addToList([], 15, "unsubscribed");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("unsubscribeFromList", () => {
  it("unsubscribes the given subscribers from that one list", async () => {
    const fetchMock = mockFetch();

    await unsubscribeFromList([42, 43], 15);

    expect(writes(fetchMock.mock.calls)).toEqual(["PUT /api/subscribers/lists"]);
    expect(body(fetchMock.mock.calls[0])).toEqual({
      ids: [42, 43],
      action: "unsubscribe",
      target_list_ids: [15],
    });
  });

  it("sends nothing for an empty batch", async () => {
    const fetchMock = mockFetch();
    await unsubscribeFromList([], 15);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("resolveFromAddress", () => {
  it("accepts a sender on the SES identity, with or without a display name", () => {
    expect(resolveFromAddress()).toBe("Rico Trebeljahr <noreply@mail.ricos.site>");
    process.env.LISTMONK_FROM = "NoReply@Mail.Ricos.Site";
    expect(resolveFromAddress()).toBe("NoReply@Mail.Ricos.Site");
  });

  it("refuses any other domain, which SES would drop after ListMonk said OK", () => {
    for (const from of [
      "Rico Trebeljahr <rico@trebeljahr.com>",
      "ricotrebeljahr@gmail.com",
      "noreply@ricos.site",
      "noreply@evilmail.ricos.site",
      "Spoof <noreply@mail.ricos.site.example.com>",
    ]) {
      process.env.LISTMONK_FROM = from;
      expect(() => resolveFromAddress(), from).toThrow(/must be an address @mail\.ricos\.site/);
    }
  });
});

describe("sendTransactional", () => {
  it("sends through the tx template with the configured sender", async () => {
    process.env.LISTMONK_REPLY_TO = "Rico <reply@example.com>";
    const fetchMock = mockFetch();

    await sendTransactional({ to: "Reader@Example.com", subject: "Confirm", html: "<p>Hi</p>" });

    expect(writes(fetchMock.mock.calls)).toEqual(["POST /api/tx"]);
    expect(body(fetchMock.mock.calls[0])).toEqual({
      subscriber_email: "reader@example.com",
      // Nobody signing up is a subscriber yet; the default mode answers 400.
      subscriber_mode: "external",
      template_id: 13,
      from_email: "Rico Trebeljahr <noreply@mail.ricos.site>",
      headers: [{ "Reply-To": "Rico <reply@example.com>" }],
      data: { subject: "Confirm", body: "<p>Hi</p>" },
      content_type: "html",
      messenger: "email",
    });
  });
});

describe("sendCampaign", () => {
  it("creates the campaign on the given list and starts it", async () => {
    const fetchMock = mockFetch(jsonResponse({ data: { id: 7 } }));

    await expect(
      sendCampaign({ listId: 16, name: "n", subject: "s", html: "<p>h</p>", text: "t" }),
    ).resolves.toEqual({ id: 7, url: "https://listmonk.test/admin/campaigns/7" });

    expect(writes(fetchMock.mock.calls)).toEqual([
      "POST /api/campaigns",
      "PUT /api/campaigns/7/status",
    ]);
    expect(body(fetchMock.mock.calls[0])).toMatchObject({
      lists: [16],
      template_id: 14,
      body: "<p>h</p>",
      altbody: "t",
      send_later: false,
    });
    expect(body(fetchMock.mock.calls[1])).toEqual({ status: "running" });
  });

  it("refuses a sender off the SES identity before creating anything", async () => {
    process.env.LISTMONK_FROM = "Rico <ricotrebeljahr@gmail.com>";
    const fetchMock = mockFetch();
    await expect(
      sendCampaign({ listId: 16, name: "n", subject: "s", html: "h", text: "t" }),
    ).rejects.toThrow(/LISTMONK_FROM/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("names the stranded draft when starting fails", async () => {
    mockFetch(jsonResponse({ data: { id: 7 } }), new Response("boom", { status: 500 }));
    await expect(
      sendCampaign({ listId: 16, name: "n", subject: "s", html: "h", text: "t" }),
    ).rejects.toThrow(/Campaign 7 was created but could not be started.*Do not re-run/);
  });
});

describe("escapeGoTemplate", () => {
  it("quotes every opening delimiter and leaves the rest", () => {
    expect(escapeGoTemplate("a {{ b }} c {{{d}}}")).toBe('a {{"{{"}} b }} c {{"{{"}}{d}}}');
    expect(escapeGoTemplate("no braces { here }")).toBe("no braces { here }");
  });
});
