/**
 * One-off: move the confirmed Live and Learn readers from Mailgun to ListMonk.
 *
 *   pnpm newsletter:import           → dry run: counts and a masked sample, writes nothing
 *   pnpm newsletter:import --apply   → add them to LISTMONK_LIVE_LIST_ID as `confirmed`
 *
 * Takes the `subscribed: yes` members of the Mailgun list, drops every
 * address on the domain's bounce, complaint and unsubscribe lists, and adds
 * the rest to the live ListMonk list as `confirmed` (preconfirmed, so
 * ListMonk sends no opt-in email). Safe to re-run: members already
 * confirmed are left alone, and anyone who has since unsubscribed from
 * the ListMonk list or been blocklisted is skipped.
 *
 * Run it at the cutover, not before, so Mailgun unsubscribes up to that
 * moment carry over. The ListMonk instance is shared: output masks every
 * address.
 */
import "dotenv/config";
import {
  confirmSubscription,
  findSubscriber,
  getList,
  listmonkBaseUrl,
} from "src/lib/newsletter/listmonk.js";

const MAILGUN_API = "https://api.eu.mailgun.net/v3";
const MAILGUN_DOMAIN = "newsletter.trebeljahr.com";
// The production list, whatever NODE_ENV says.
const MAILGUN_LIST = `hi@${MAILGUN_DOMAIN}`;
const SUPPRESSIONS = ["bounces", "complaints", "unsubscribes"] as const;

type Paged<T> = { items: T[]; paging?: { next?: string } };

async function mailgunPages<T>(firstUrl: string): Promise<T[]> {
  const key = process.env.MAILGUN_API_KEY;
  if (!key) throw new Error("Missing MAILGUN_API_KEY");
  const auth = `Basic ${Buffer.from(`api:${key}`).toString("base64")}`;
  const out: T[] = [];
  const seen = new Set<string>();
  let url: string | undefined = firstUrl;
  while (url && !seen.has(url)) {
    seen.add(url);
    const res = await fetch(url, { headers: { Authorization: auth } });
    if (!res.ok) throw new Error(`Mailgun GET ${url}: ${res.status} ${await res.text()}`);
    const page = (await res.json()) as Paged<T>;
    if (page.items.length === 0) break;
    out.push(...page.items);
    url = page.paging?.next;
  }
  return out;
}

export function maskEmail(email: string): string {
  const [local, domain = ""] = email.split("@");
  const dot = domain.lastIndexOf(".");
  const host = dot > 0 ? domain.slice(0, dot) : domain;
  const tld = dot > 0 ? domain.slice(dot) : "";
  return `${local.slice(0, 1)}***@${host.slice(0, 1)}***${tld}`;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const unknownArgs = args.filter((arg) => arg !== "--apply");
  if (unknownArgs.length > 0) {
    console.error(
      `Unknown argument: ${unknownArgs.join(" ")}\nusage: pnpm newsletter:import [--apply]`,
    );
    process.exit(1);
  }

  const members = await mailgunPages<{ address: string; subscribed: boolean }>(
    `${MAILGUN_API}/lists/${MAILGUN_LIST}/members/pages?subscribed=yes&limit=100`,
  );
  const subscribed = [
    ...new Set(members.filter((m) => m.subscribed).map((m) => m.address.trim().toLowerCase())),
  ];

  const suppressed = new Map<string, string[]>();
  for (const kind of SUPPRESSIONS) {
    const items = await mailgunPages<{ address: string }>(
      `${MAILGUN_API}/${MAILGUN_DOMAIN}/${kind}?limit=1000`,
    );
    for (const { address } of items) {
      const email = address.trim().toLowerCase();
      suppressed.set(email, [...(suppressed.get(email) ?? []), kind]);
    }
  }

  const dropped = subscribed.filter((email) => suppressed.has(email));
  const toImport = subscribed.filter((email) => !suppressed.has(email)).sort();

  console.info(`Mailgun list ${MAILGUN_LIST}: ${subscribed.length} subscribed`);
  for (const kind of SUPPRESSIONS) {
    const n = dropped.filter((email) => suppressed.get(email)?.includes(kind)).length;
    console.info(`  dropped, on ${kind}: ${n}`);
  }
  console.info(`To import: ${toImport.length}`);
  const step = Math.max(1, Math.floor(toImport.length / 8));
  const sample = toImport.filter((_, i) => i % step === 0).slice(0, 8);
  console.info(`Sample: ${sample.map(maskEmail).join(", ")}`);

  const listId = Number(process.env.LISTMONK_LIVE_LIST_ID);
  if (!Number.isInteger(listId) || listId <= 0) throw new Error("Set LISTMONK_LIVE_LIST_ID");
  const list = await getList(listId);
  console.info(
    `Target: ${listmonkBaseUrl()} list ${list.id} "${list.name}" (${list.optin} opt-in), ` +
      `${list.subscriber_statuses?.confirmed ?? 0} confirmed now`,
  );
  // A test list gets test campaigns: real readers must never land on one.
  if (list.name.endsWith("-test")) {
    throw new Error(`Refusing to import into test list "${list.name}"`);
  }
  if (list.optin !== "double") throw new Error(`List "${list.name}" must be double opt-in`);

  if (!apply) {
    console.info("Dry run: nothing written. Re-run with --apply to import.");
    return;
  }

  const tally = { added: 0, alreadyConfirmed: 0, unsubscribed: 0, blocklisted: 0 };
  for (const email of toImport) {
    const existing = await findSubscriber(email);
    const membership = existing?.lists?.find((l) => l.id === listId);
    if (existing?.status === "blocklisted") {
      tally.blocklisted++;
    } else if (membership?.subscription_status === "unsubscribed") {
      tally.unsubscribed++;
    } else if (membership?.subscription_status === "confirmed") {
      tally.alreadyConfirmed++;
    } else {
      await confirmSubscription(email, listId);
      tally.added++;
    }
  }
  console.info(
    `Imported: ${tally.added} added, ${tally.alreadyConfirmed} already confirmed, ` +
      `skipped ${tally.unsubscribed} unsubscribed and ${tally.blocklisted} blocklisted.`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
