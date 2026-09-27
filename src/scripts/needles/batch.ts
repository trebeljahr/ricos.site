/**
 * The offline half of the classification pass: prompts out, answers in.
 *
 *   pnpm needles:batch export --count 300 --batch 60
 *   pnpm needles:batch apply .needles-batches
 *
 * `export` writes one prompt per file into .needles-batches/ (gitignored).
 * An agent session — subagents in Claude Code, or any other model — answers
 * each prompt with the JSON array it asks for, saves it next to the prompt as
 * `<name>.result.json`, and `apply` merges every result it finds.
 *
 * This exists because the `claude` CLI login is not always usable from a
 * script, and because a few hundred links are worth reviewing in parallel by
 * several agents. It writes through the same applyGuesses rules as classify.ts,
 * so an offline answer cannot publish anything either.
 */
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

import { readNeedles, writeNeedles } from "src/lib/needlestack/store";
import type { Pool } from "src/lib/needlestack/types";

import { applyGuesses, buildPrompt, extractJsonArray } from "./classifyCore";

const DEFAULT_DIR = resolve(process.cwd(), ".needles-batches");

function parseArgs(argv: string[]) {
  const flag = (name: string) => {
    const index = argv.indexOf(`--${name}`);
    return index === -1 ? undefined : argv[index + 1];
  };
  return {
    command: argv[0] === "apply" ? "apply" : "export",
    target: argv[1] && !argv[1].startsWith("--") ? resolve(argv[1]) : DEFAULT_DIR,
    count: Number(flag("count") ?? 300),
    batch: Number(flag("batch") ?? 60),
    pool: flag("pool") as Pool | undefined,
    model: flag("model") ?? "agent",
    redo: argv.includes("--redo"),
  };
}

async function exportBatches(args: ReturnType<typeof parseArgs>) {
  const needles = await readNeedles();
  const pending = needles
    .filter((needle) => {
      if (args.pool && needle.pool !== args.pool) return false;
      if (needle.status === "reviewed" || needle.status === "rejected") return false;
      return args.redo ? true : needle.status === "unclassified";
    })
    .slice(0, args.count);

  if (pending.length === 0) {
    console.log("nothing to export");
    return;
  }

  await mkdir(args.target, { recursive: true });
  let written = 0;
  for (let index = 0; index < pending.length; index += args.batch) {
    const slice = pending.slice(index, index + args.batch);
    const name = `batch-${String(written + 1).padStart(3, "0")}`;
    await writeFile(resolve(args.target, `${name}.prompt.txt`), `${buildPrompt(slice)}\n`);
    written++;
  }

  console.log(
    `wrote ${written} prompt(s) for ${pending.length} links to ${args.target}\n` +
      `answer each <name>.prompt.txt with a JSON array saved as <name>.result.json, then:\n` +
      `  pnpm needles:batch apply ${args.target}`,
  );
}

async function applyBatches(args: ReturnType<typeof parseArgs>) {
  if (!existsSync(args.target)) {
    console.error(`no such directory or file: ${args.target}`);
    process.exit(1);
  }

  const files = args.target.endsWith(".json")
    ? [args.target]
    : (await readdir(args.target))
        .filter((name) => name.endsWith(".result.json"))
        .map((name) => resolve(args.target, name));

  if (files.length === 0) {
    console.error(`no *.result.json files in ${args.target}`);
    process.exit(1);
  }

  const needles = await readNeedles();
  let applied = 0;
  let unknown = 0;
  let badPaths = 0;

  for (const file of files) {
    try {
      const rows = extractJsonArray(await readFile(file, "utf8"));
      const result = applyGuesses(needles, rows, args.model);
      applied += result.applied;
      unknown += result.unknownIds.length;
      badPaths += result.droppedPaths.length;
      console.log(`${basename(file)}: ${result.applied} applied`);
    } catch (error) {
      console.error(`${basename(file)}: ${(error as Error).message}`);
    }
  }

  await writeNeedles(needles);
  const left = needles.filter((needle) => needle.status === "unclassified").length;
  console.log(
    `applied ${applied} guesses (${unknown} unknown ids, ${badPaths} bad paths), ${left} still unclassified`,
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.command === "apply") await applyBatches(args);
  else await exportBatches(args);
}

void main();
