import { describe, expect, it, vi } from "vitest";
import type { ListmonkSubscriber, SubscriptionStatus } from "./listmonk";
import type { MailgunMember, Suppression } from "./mailgunAudience";
import {
  countOutcomes,
  countSuppressedOutcomes,
  importOutcome,
  planImport,
  suppressedOutcome,
  suppressionMark,
} from "./mailgunImport";

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

describe("suppressionMark", () => {
  it("blocklists a bounce or complaint, even next to an unsubscribe", () => {
    expect(suppressionMark(["bounces"])).toBe("blocklisted");
    expect(suppressionMark(["complaints", "unsubscribes"])).toBe("blocklisted");
    expect(suppressionMark(["unsubscribes"])).toBe("unsubscribed");
  });
});

describe("suppressedOutcome", () => {
  it("creates an address ListMonk has never seen", () => {
    expect(suppressedOutcome(null, LIVE)).toBe("create");
  });

  it("never blocklists another project's subscriber, only unsubscribes it here", () => {
    expect(suppressedOutcome(subscriber("enabled", [[3, "confirmed"]]), LIVE)).toBe(
      "addUnsubscribed",
    );
    expect(suppressedOutcome(subscriber("disabled"), LIVE)).toBe("addUnsubscribed");
  });

  it("leaves ListMonk's own state alone", () => {
    expect(suppressedOutcome(subscriber("blocklisted"), LIVE)).toBe("alreadyBlocklisted");
    // A confirmed membership on the live list is newer than anything on Mailgun.
    for (const status of ["confirmed", "unconfirmed", "unsubscribed"] as const) {
      expect(suppressedOutcome(subscriber("enabled", [[LIVE, status]]), LIVE)).toBe(
        "keepMembership",
      );
    }
  });
});

describe("planImport", () => {
  const member = (address: string, subscribed: boolean): MailgunMember => ({ address, subscribed });

  it("confirms clean Mailgun readers and carries every suppression over", async () => {
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
      // Bounced its confirmation email, never on the list.
      ["typo@example.con", ["bounces"]],
      ["other-project@example.com", ["complaints"]],
    ]);
    const lookup = vi.fn(async (email: string) => {
      if (email === "known@example.com") return subscriber("blocklisted");
      if (email === "other-project@example.com") return subscriber("enabled", [[3, "confirmed"]]);
      return null;
    });

    const plan = await planImport({ members, suppressions, listId: LIVE, lookup });

    expect(plan).toMatchObject({
      members: 6,
      subscribed: 4,
      notSubscribed: 2,
      subscribedSuppressed: 2,
      suppressedTotal: 5,
      suppressed: { bounces: 2, complaints: 2, unsubscribes: 2 },
    });
    expect(plan.entries.map((e) => [e.email, e.outcome])).toEqual([
      ["known@example.com", "skipBlocklisted"],
      ["new@example.com", "create"],
    ]);
    expect(
      plan.suppressedEntries.map((e) => [e.email, e.mark, e.member, e.outcome, e.subscriberId]),
    ).toEqual([
      ["both@example.com", "blocklisted", true, "create", undefined],
      ["bounced@example.com", "blocklisted", true, "create", undefined],
      ["left@example.com", "unsubscribed", true, "create", undefined],
      ["other-project@example.com", "blocklisted", false, "addUnsubscribed", 1],
      ["typo@example.con", "blocklisted", false, "create", undefined],
    ]);
    // A `subscribed: no` member off every suppression list is never looked up.
    expect(lookup.mock.calls.map(([email]) => email)).not.toContain("never-confirmed@example.com");
    expect(countOutcomes(plan.entries)).toEqual({
      create: 1,
      add: 0,
      alreadyConfirmed: 0,
      skipUnsubscribed: 0,
      skipBlocklisted: 1,
      skipDisabled: 0,
    });
    expect(countSuppressedOutcomes(plan.suppressedEntries, "blocklisted")).toEqual({
      create: 3,
      addUnsubscribed: 1,
      alreadyBlocklisted: 0,
      keepMembership: 0,
    });
    expect(countSuppressedOutcomes(plan.suppressedEntries, "unsubscribed")).toEqual({
      create: 1,
      addUnsubscribed: 0,
      alreadyBlocklisted: 0,
      keepMembership: 0,
    });
  });

  it("finds nothing left to write once the import has run", async () => {
    const plan = await planImport({
      members: [member("reader@example.com", true), member("left@example.com", false)],
      suppressions: new Map<string, Suppression[]>([
        ["left@example.com", ["unsubscribes"]],
        ["bounced@example.com", ["bounces"]],
      ]),
      listId: LIVE,
      lookup: async (email) => {
        if (email === "reader@example.com") return subscriber("enabled", [[LIVE, "confirmed"]]);
        if (email === "left@example.com") return subscriber("enabled", [[LIVE, "unsubscribed"]]);
        return subscriber("blocklisted", [[LIVE, "unsubscribed"]]);
      },
    });
    expect(plan.entries.map((e) => e.outcome)).toEqual(["alreadyConfirmed"]);
    expect(plan.suppressedEntries.map((e) => e.outcome)).toEqual([
      "alreadyBlocklisted",
      "keepMembership",
    ]);
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
