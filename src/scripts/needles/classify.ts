/**
 * Batch classification pass over unclassified needles, driven by the `claude`
 * CLI in print mode.
 *
 *   pnpm needles:classify                      500 links, Haiku, 60 per call
 *   pnpm needles:classify --limit 2000
 *   pnpm needles:classify --pool best --batch 40 --model sonnet
 *   pnpm needles:classify --redo               also re-run already classified
 *   pnpm needles:classify --print-prompt       show one prompt and exit
 *
 * Titles and folder names only, no page fetching: 60 links per call keeps this
 * cheap enough to run over thousands, and a wrong guess costs one keystroke in
 * /dev/needlestack. Page contents come later and only for links Rico promotes
 * (see skim.ts).
 *
 * The pass never publishes anything — see applyGuesses in classifyCore.ts.
 */
import { readNeedles, writeNeedles } from "src/lib/needlestack/store";
import type { Needle, Pool } from "src/lib/needlestack/types";
import { applyGuesses, buildPrompt, type GuessRow } from "./classifyCore";
import { askForJson, ClaudeAuthError } from "./claudeCli";

type Args = {
  limit: number;
  batch: number;
  model: string;
  pool?: Pool;
  redo: boolean;
  printPrompt: boolean;
  concurrency: number;
};

function parseArgs(argv: string[]): Args {
  const flag = (name: string) => {
    const index = argv.indexOf(`--${name}`);
    return index === -1 ? undefined : argv[index + 1];
  };
  return {
    limit: Number(flag("limit") ?? 500),
    batch: Number(flag("batch") ?? 60),
    model: flag("model") ?? "haiku",
    pool: flag("pool") as Pool | undefined,
    redo: argv.includes("--redo"),
    printPrompt: argv.includes("--print-prompt"),
    concurrency: Number(flag("concurrency") ?? 3),
  };
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size)
    chunks.push(items.slice(index, index + size));
  return chunks;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const needles = await readNeedles();

  const pending = needles.filter((needle) => {
    if (args.pool && needle.pool !== args.pool) return false;
    if (needle.status === "reviewed" || needle.status === "rejected") return false;
    return args.redo ? true : needle.status === "unclassified";
  });

  const todo = pending.slice(0, args.limit);
  if (todo.length === 0) {
    console.log("nothing to classify");
    return;
  }

  const batches = chunk(todo, args.batch);
  if (args.printPrompt) {
    console.log(buildPrompt(batches[0]));
    return;
  }

  console.log(
    `${todo.length} links (of ${pending.length} pending) in ${batches.length} batches, model ${args.model}`,
  );

  let done = 0;
  let failed = 0;
  let index = 0;

  // A small pool of workers rather than all batches at once: the CLI starts a
  // process per call, and a burst of 30 is a good way to get rate limited.
  async function worker() {
    while (index < batches.length) {
      const batch = batches[index++];
      const label = `batch ${index}/${batches.length}`;
      try {
        const rows = await askForJson<GuessRow>(buildPrompt(batch), args.model);
        const applied = applyGuesses(needles, rows, args.model);
        // Write after every batch: a crash or a rate limit halfway through
        // should keep the work already paid for.
        await writeNeedles(needles);
        done += applied.applied;
        console.log(
          `${label}: ${applied.applied}/${batch.length} applied` +
            (applied.droppedPaths.length > 0 ? `, ${applied.droppedPaths.length} bad paths` : "") +
            (applied.unknownIds.length > 0 ? `, ${applied.unknownIds.length} unknown ids` : ""),
        );
      } catch (error) {
        failed++;
        console.error(`${label}: ${(error as Error).message.slice(0, 300)}`);
        if (error instanceof ClaudeAuthError) {
          console.error(
            "The claude CLI cannot run here (login, credit or rate limit). Run `claude` once " +
              "interactively, or use `pnpm needles:batch export` and let an agent session answer " +
              "the prompts.",
          );
          // No point burning through 20 more batches against the same wall.
          index = batches.length;
        }
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(args.concurrency, batches.length)) }, worker),
  );

  const left = needles.filter((needle: Needle) => needle.status === "unclassified").length;
  console.log(`classified ${done}, ${failed} failed batches, ${left} still unclassified`);
}

void main();
