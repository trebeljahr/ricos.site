import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  confirmSubscription,
  ensureSubscriber,
  escapeGoTemplate,
  findSubscriber,
  isConfirmedOnList,
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
  process.env.LISTMONK_FROM = "Rico Trebeljahr <rico@example.com>";
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

describe("ensureSubscriber", () => {
  it("creates a missing subscriber on no list", async () => {
    const fetchMock = mockFetch(
      jsonResponse({ data: { results: [], total: 0 } }),
      jsonResponse({ data: { ...subscriber, lists: [] } }),
    );

    await ensureSubscriber("Reader@Example.com");

    expect(writes(fetchMock.mock.calls)).toEqual(["POST /api/subscribers"]);
    expect(body(fetchMock.mock.calls[1])).toMatchObject({
      email: "reader@example.com",
      lists: [],
      preconfirm_subscriptions: true,
    });
  });

  it("leaves an existing subscriber's lists alone", async () => {
    // Unsubscribed from ours: submitting the form again must not re-add it.
    const existing = {
      ...subscriber,
      lists: [{ ...subscriber.lists[0], subscription_status: "unsubscribed" as const }],
    };
    const fetchMock = mockFetch(jsonResponse({ data: { results: [existing], total: 1 } }));

    await expect(ensureSubscriber("reader@example.com")).resolves.toEqual(existing);
    expect(writes(fetchMock.mock.calls)).toEqual([]);
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

  it("recreates a missing subscriber on the list, preconfirmed", async () => {
    const fetchMock = mockFetch(
      jsonResponse({ data: { results: [], total: 0 } }),
      jsonResponse({ data: subscriber }),
    );

    await confirmSubscription("reader@example.com", 15);

    expect(writes(fetchMock.mock.calls)).toEqual(["POST /api/subscribers"]);
    expect(body(fetchMock.mock.calls[1])).toMatchObject({
      email: "reader@example.com",
      lists: [15],
      preconfirm_subscriptions: true,
    });
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

describe("sendTransactional", () => {
  it("sends through the tx template with the configured sender", async () => {
    process.env.LISTMONK_REPLY_TO = "Rico <reply@example.com>";
    const fetchMock = mockFetch();

    await sendTransactional({ to: "Reader@Example.com", subject: "Confirm", html: "<p>Hi</p>" });

    expect(writes(fetchMock.mock.calls)).toEqual(["POST /api/tx"]);
    expect(body(fetchMock.mock.calls[0])).toEqual({
      subscriber_email: "reader@example.com",
      template_id: 13,
      from_email: "Rico Trebeljahr <rico@example.com>",
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
