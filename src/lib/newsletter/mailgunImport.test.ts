import { describe, expect, it, vi } from "vitest";
import type { ListmonkSubscriber, SubscriptionStatus } from "./listmonk";
import type { MailgunMember, Suppression } from "./mailgunAudience";
import { countOutcomes, importOutcome, planImport } from "./mailgunImport";

const LIVE = 15;

function subscriber(
  status: ListmonkSubscriber["status"],
  lists: Array<[number, SubscriptionStatus]> = [],
): ListmonkSubscriber {
  return {
    id: 1,
    uuid: "u",
    email: "x@example.com",
    name: "x@example.com",
    status,
    lists: lists.map(([id, subscription_status]) => ({
      id,
      uuid: `l${id}`,
      name: `list-${id}`,
      subscription_status,
    })),
  };
}

describe("importOutcome", () => {
  it("creates an address ListMonk has never seen", () => {
    expect(importOutcome(null, LIVE)).toBe("create");
  });

  it("confirms an enabled subscriber that is not confirmed on the live list", () => {
    expect(importOutcome(subscriber("enabled", [[3, "confirmed"]]), LIVE)).toBe("add");
    expect(importOutcome(subscriber("enabled", [[LIVE, "unconfirmed"]]), LIVE)).toBe("add");
  });

  it("leaves ListMonk's own opt-outs exactly as they are", () => {
    expect(importOutcome(subscriber("enabled", [[LIVE, "unsubscribed"]]), LIVE)).toBe(
      "skipUnsubscribed",
    );
    expect(importOutcome(subscriber("blocklisted"), LIVE)).toBe("skipBlocklisted");
    // Blocklisting wins even over a membership that still says confirmed.
    expect(importOutcome(subscriber("blocklisted", [[LIVE, "confirmed"]]), LIVE)).toBe(
      "skipBlocklisted",
    );
    expect(importOutcome(subscriber("disabled"), LIVE)).toBe("skipDisabled");
  });

  it("does nothing for a reader already confirmed", () => {
    expect(importOutcome(subscriber("enabled", [[LIVE, "confirmed"]]), LIVE)).toBe(
      "alreadyConfirmed",
    );
  });
});

describe("planImport", () => {
  const member = (address: string, subscribed: boolean): MailgunMember => ({ address, subscribed });

  it("imports only confirmed, unsuppressed Mailgun readers and counts the rest", async () => {
    const members = [
      member("New@Example.com", true),
      member("known@example.com", true),
      member("bounced@example.com", true),
      member("both@example.com", true),
      member("left@example.com", false),
      member("never-confirmed@example.com", false),
    ];
    const suppressions = new Map<string, Suppression[]>([
      ["bounced@example.com", ["bounces"]],
      ["both@example.com", ["complaints", "unsubscribes"]],
      ["left@example.com", ["unsubscribes"]],
    ]);
    const lookup = vi.fn(async (email: string) =>
      email === "known@example.com" ? subscriber("blocklisted") : null,
    );

    const plan = await planImport({ members, suppressions, listId: LIVE, lookup });

    expect(plan).toMatchObject({
      members: 6,
      subscribed: 4,
      notSubscribed: 2,
      suppressedTotal: 2,
      suppressed: { bounces: 1, complaints: 1, unsubscribes: 1 },
    });
    expect(plan.entries.map((e) => [e.email, e.outcome])).toEqual([
      ["known@example.com", "skipBlocklisted"],
      ["new@example.com", "create"],
    ]);
    // Suppressed and unsubscribed addresses are never even looked up on ListMonk.
    expect(lookup.mock.calls.map(([email]) => email).sort()).toEqual([
      "known@example.com",
      "new@example.com",
    ]);
    expect(countOutcomes(plan.entries)).toEqual({
      create: 1,
      add: 0,
      alreadyConfirmed: 0,
      skipUnsubscribed: 0,
      skipBlocklisted: 1,
      skipDisabled: 0,
    });
  });

  it("keeps the subscribed entry when Mailgun lists an address twice", async () => {
    const plan = await planImport({
      members: [member("dup@example.com", false), member("DUP@example.com", true)],
      suppressions: new Map(),
      listId: LIVE,
      lookup: async () => null,
    });
    expect(plan).toMatchObject({ members: 1, subscribed: 1, notSubscribed: 0 });
    expect(plan.entries).toHaveLength(1);
  });
});
