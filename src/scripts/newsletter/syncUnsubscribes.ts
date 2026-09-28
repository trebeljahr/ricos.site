/**
 * Weekly until Mailgun is decommissioned: copy unsubscribes from issues
 * sent through Mailgun into the live ListMonk list.
 *
 *   pnpm newsletter:sync-unsubscribes           → dry run: counts and masked addresses
 *   pnpm newsletter:sync-unsubscribes --apply   → unsubscribe them from LISTMONK_LIVE_LIST_ID
 *
 * Covers readers the import tagged on Mailgun, so it only finds anything
 * after `pnpm newsletter:import --apply`. See src/lib/newsletter/syncUnsubscribes.ts.
 */
import "dotenv/config";
import { syncUnsubscribes } from "src/lib/newsletter/syncUnsubscribes.js";

async function main() {
  const args = process.argv.slice(2);
  const unknownArgs = args.filter((arg) => arg !== "--apply");
  if (unknownArgs.length > 0) {
    console.error(
      `Unknown argument: ${unknownArgs.join(" ")}\nusage: pnpm newsletter:sync-unsubscribes [--apply]`,
    );
    process.exit(1);
  }
  await syncUnsubscribes({ apply: args.includes("--apply") });
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
