/**
 * ListMonk HTTP API client for the Live and Learn newsletter.
 *
 * listmonk.trebeljahr.com is self-hosted, shared with Rico's other
 * projects, and delivers through Amazon SES SMTP (eu-west-1). The only SES
 * identity for this site is `mail.ricos.site`, so every sender address
 * must be on that domain (see `SENDER_DOMAIN`).
 *
 *   - Subscribers and list memberships live in ListMonk. An address is
 *     written to ListMonk only once it confirms (see `confirmSubscription`).
 *   - The double-opt-in email goes through `POST /api/tx` against the
 *     `ricos.site-tx` passthrough template (`{{ .Tx.Data.body | Safe }}`;
 *     tx bodies compile with html/template, so without `Safe` the HTML
 *     arrives escaped).
 *   - Issues go out as campaigns against the `ricos.site-campaign`
 *     passthrough template (`{{ template "content" . }}`), so ListMonk
 *     fills in `{{ UnsubscribeURL }}` per recipient and adds the
 *     List-Unsubscribe header.
 *
 * Env: LISTMONK_URL, LISTMONK_API_USER, LISTMONK_API_TOKEN,
 * LISTMONK_LIST_ID (the list this deployment signs people up to),
 * LISTMONK_TX_TEMPLATE_ID, LISTMONK_CAMPAIGN_TEMPLATE_ID, LISTMONK_FROM,
 * optional LISTMONK_REPLY_TO.
 */

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function positiveId(name: string, raw: string): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`Invalid ${name}: ${raw}`);
  return n;
}

export function listmonkBaseUrl(): string {
  return required("LISTMONK_URL").replace(/\/$/, "");
}

function authHeader(): string {
  return `token ${required("LISTMONK_API_USER")}:${required("LISTMONK_API_TOKEN")}`;
}

async function listmonkFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${listmonkBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`listmonk ${init.method ?? "GET"} ${path}: ${res.status} ${text}`);
  }
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export function resolveListId(): number {
  return positiveId("LISTMONK_LIST_ID", required("LISTMONK_LIST_ID"));
}

/** The SES identity ricos.site sends as. A sender on any other domain is rejected by SES. */
export const SENDER_DOMAIN = "mail.ricos.site";

/**
 * LISTMONK_FROM, as `Name <noreply@mail.ricos.site>` or a bare address.
 * ListMonk hands mail to SES after answering the API call, so an
 * unverified sender would fail silently in its logs. Refuse it here.
 */
export function resolveFromAddress(): string {
  const from = required("LISTMONK_FROM").trim();
  const address = (from.match(/<([^<>]+)>\s*$/)?.[1] ?? from).trim().toLowerCase();
  if (!address.endsWith(`@${SENDER_DOMAIN}`)) {
    throw new Error(`LISTMONK_FROM must be an address @${SENDER_DOMAIN}, got "${from}"`);
  }
  return from;
}

function resolveEmailHeaders(): Array<Record<string, string>> {
  const replyTo = process.env.LISTMONK_REPLY_TO;
  return replyTo ? [{ "Reply-To": replyTo }] : [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Subscribers
// ─────────────────────────────────────────────────────────────────────────────

export type SubscriptionStatus = "unconfirmed" | "confirmed" | "unsubscribed";

export type ListmonkSubscriberList = {
  id: number;
  uuid: string;
  name: string;
  subscription_status: SubscriptionStatus;
};

export type ListmonkSubscriber = {
  id: number;
  uuid: string;
  email: string;
  name: string;
  status: "enabled" | "disabled" | "blocklisted";
  lists?: ListmonkSubscriberList[];
};

type SubscribersQueryResponse = {
  data: { results: ListmonkSubscriber[]; total: number };
};

export async function findSubscriber(email: string): Promise<ListmonkSubscriber | null> {
  const normalized = email.toLowerCase();
  // ListMonk matches `search` as an unescaped Postgres regex
  // (`email ~* $search`). Unquoted, a plus-address never finds itself:
  // the `+` in `a+b@x.com` means "one or more a". The confirm click would
  // then try to create the subscriber again and fail with a 409.
  const pattern = `^${normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`;
  const params = new URLSearchParams({ search: pattern, per_page: "all" });
  const res = await listmonkFetch<SubscribersQueryResponse>(
    `/api/subscribers?${params.toString()}`,
  );
  return res.data.results.find((sub) => sub.email.toLowerCase() === normalized) ?? null;
}

export async function isConfirmedOnList(email: string, listId = resolveListId()): Promise<boolean> {
  const sub = await findSubscriber(email);
  const entry = sub?.lists?.find((l) => l.id === listId);
  return entry?.subscription_status === "confirmed";
}

// Double opt-in and list membership
//
// An address goes on the list only after the link in our confirmation
// email is clicked, and then as `confirmed`. Until then ListMonk holds
// nothing for it: the confirmation email goes out in `/api/tx`'s
// `external` mode (see `sendTransactional`), and the signed link carries
// the pending signup.
//
// The lists are `optin: double`, so campaigns reach `confirmed` members
// only. That is a second guard, not the mechanism: ListMonk sends its own
// opt-in email for any `unconfirmed` membership on a double list created
// or updated without `preconfirm_subscriptions`, next to ours. And if a
// list is ever single again, ListMonk mails every member not
// `unsubscribed`, `unconfirmed` included.

type CreateResp = { data: ListmonkSubscriber };

async function createSubscriber(email: string, listIds: number[]): Promise<ListmonkSubscriber> {
  const created = await listmonkFetch<CreateResp>("/api/subscribers", {
    method: "POST",
    body: JSON.stringify({
      email: email.toLowerCase(),
      // ListMonk requires a non-empty name. The form only asks for the
      // address, so reuse it.
      name: email.toLowerCase(),
      status: "enabled",
      lists: listIds,
      // Marks every list in `listIds` as `confirmed`, and stops ListMonk's
      // own opt-in email for them (with `false` it mails one per double
      // list when `app.send_optin_confirmation` is on, on top of ours).
      preconfirm_subscriptions: true,
    }),
  });
  return created.data;
}

/**
 * Add `email` to a list as `confirmed`. Only the confirm route (after the
 * link proved the reader owns the address) and the one-off Mailgun import
 * call this. Idempotent: an existing membership, whatever its status,
 * becomes `confirmed`. An address new to ListMonk is created on the list,
 * preconfirmed.
 */
export async function confirmSubscription(email: string, listId = resolveListId()): Promise<void> {
  const existing = await findSubscriber(email);
  if (!existing) {
    await createSubscriber(email, [listId]);
    return;
  }
  await listmonkFetch("/api/subscribers/lists", {
    method: "PUT",
    body: JSON.stringify({
      ids: [existing.id],
      action: "add",
      target_list_ids: [listId],
      status: "confirmed",
    }),
  });
}

/**
 * Mark subscribers `unsubscribed` on `listId` only. Their memberships on
 * other lists (other projects on the shared instance) stay as they are,
 * and a membership already `unsubscribed` stays so.
 */
export async function unsubscribeFromList(subscriberIds: number[], listId: number): Promise<void> {
  if (subscriberIds.length === 0) return;
  await listmonkFetch("/api/subscribers/lists", {
    method: "PUT",
    body: JSON.stringify({
      ids: subscriberIds,
      action: "unsubscribe",
      target_list_ids: [listId],
    }),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Transactional send (confirmation email)
// ─────────────────────────────────────────────────────────────────────────────

export type SendTransactionalParams = { to: string; subject: string; html: string };

/**
 * Send one email to any address, subscriber or not.
 *
 * `subscriber_mode: "external"` skips ListMonk's subscriber lookup. The
 * default mode answers 400 for an address it does not know, which is
 * everyone signing up for the first time. No mode checks the blocklist
 * (ListMonk v6 `cmd/tx.go`), so the caller must.
 */
export async function sendTransactional(params: SendTransactionalParams): Promise<void> {
  const templateId = positiveId("LISTMONK_TX_TEMPLATE_ID", required("LISTMONK_TX_TEMPLATE_ID"));
  const headers = resolveEmailHeaders();
  await listmonkFetch("/api/tx", {
    method: "POST",
    body: JSON.stringify({
      subscriber_email: params.to.toLowerCase(),
      subscriber_mode: "external",
      template_id: templateId,
      from_email: resolveFromAddress(),
      ...(headers.length > 0 ? { headers } : {}),
      data: { subject: params.subject, body: params.html },
      content_type: "html",
      messenger: "email",
    }),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Campaigns (newsletter issues)
// ─────────────────────────────────────────────────────────────────────────────

export type ListmonkList = {
  id: number;
  name: string;
  optin: "single" | "double";
  subscriber_count: number;
  subscriber_statuses?: Partial<Record<SubscriptionStatus, number>>;
};

export async function getList(listId: number): Promise<ListmonkList> {
  const res = await listmonkFetch<{ data: ListmonkList }>(`/api/lists/${listId}`);
  return res.data;
}

/** The production list (LISTMONK_LIVE_LIST_ID), for the Mailgun import and sync scripts. */
export async function getLiveList(): Promise<ListmonkList> {
  const list = await getList(
    positiveId("LISTMONK_LIVE_LIST_ID", required("LISTMONK_LIVE_LIST_ID")),
  );
  // A test list gets test campaigns: real readers must never land on one.
  if (list.name.endsWith("-test")) {
    throw new Error(`LISTMONK_LIVE_LIST_ID points at test list "${list.name}"`);
  }
  return list;
}

/**
 * ListMonk parses a campaign's body and plain-text body as Go templates.
 * Quote every `{{` the issue itself contains (a code sample, a stray
 * brace in a title) so only the placeholders we add stay live.
 */
export function escapeGoTemplate(text: string): string {
  return text.replace(/\{\{/g, '{{"{{"}}');
}

export type SendCampaignParams = {
  listId: number;
  /** Internal name shown in the ListMonk admin UI. */
  name: string;
  subject: string;
  html: string;
  text: string;
};

export type CampaignResult = { id: number; url: string };

/**
 * Create a campaign on `listId` and move it to `running` so ListMonk
 * starts dispatching. `html` and `text` are Go templates: run the issue
 * through `escapeGoTemplate` before adding `{{ UnsubscribeURL }}`.
 */
export async function sendCampaign(params: SendCampaignParams): Promise<CampaignResult> {
  const headers = resolveEmailHeaders();
  const templateId = positiveId(
    "LISTMONK_CAMPAIGN_TEMPLATE_ID",
    required("LISTMONK_CAMPAIGN_TEMPLATE_ID"),
  );

  const created = await listmonkFetch<{ data: { id: number } }>("/api/campaigns", {
    method: "POST",
    body: JSON.stringify({
      name: params.name,
      subject: params.subject,
      lists: [params.listId],
      from_email: resolveFromAddress(),
      content_type: "html",
      body: params.html,
      altbody: params.text,
      type: "regular",
      template_id: templateId,
      ...(headers.length > 0 ? { headers } : {}),
      send_later: false,
    }),
  });

  const id = created.data.id;
  const url = `${listmonkBaseUrl()}/admin/campaigns/${id}`;
  // The draft already exists here. If the flip to `running` fails, say so:
  // re-running the send would create a second campaign, not start this one.
  try {
    await listmonkFetch(`/api/campaigns/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status: "running" }),
    });
  } catch (err) {
    throw new Error(
      `Campaign ${id} was created but could not be started: ${
        err instanceof Error ? err.message : String(err)
      }. Do not re-run the send, that creates a second campaign. Start or delete campaign ${id} at ${url}.`,
      { cause: err },
    );
  }

  return { id, url };
}
