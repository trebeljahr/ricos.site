/**
 * What is left to do, from the terminal.
 *
 *   pnpm needles:stats            counts by status, rating, pool and door
 *   pnpm needles:stats --folders  biggest unclassified bookmark folders
 *
 * The same numbers show at the top of /dev/needlestack; this is for checking
 * progress without leaving the shell, and for the dev-server banner.
 */
import { readNeedles } from "src/lib/needlestack/store";
import { DOORS } from "src/lib/needlestack/taxonomy";
import type { Needle } from "src/lib/needlestack/types";

function tally<T extends string | number>(items: T[]): [T, number][] {
  const counts = new Map<T, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

const line = (label: string, rows: [string | number, number][]) =>
  `${label.padEnd(10)} ${rows.map(([key, count]) => `${key}: ${count}`).join("  ")}`;

async function main() {
  const needles = await readNeedles();
  if (needles.length === 0) {
    console.log("needles.json is empty — run pnpm needles:import first");
    return;
  }

  const outstanding = needles.filter(
    (needle) => needle.status === "unclassified" || needle.status === "classified",
  );
  const publishable = needles.filter(
    (needle) => needle.status === "reviewed" && needle.rating >= 1,
  );
  const withNote = publishable.filter((needle) => needle.noteSource === "manual");

  console.log(`${needles.length} needles`);
  console.log(line("status", tally(needles.map((needle) => needle.status))));
  console.log(line("rating", tally(needles.map((needle) => needle.rating))));
  console.log(line("pool", tally(needles.map((needle) => needle.pool))));
  console.log(line("type", tally(needles.map((needle) => needle.type)).slice(0, 8)));
  console.log(
    line(
      "doors",
      DOORS.map(
        (door) =>
          [door.id, needles.filter((needle) => needle.door === door.id).length] as [string, number],
      ),
    ),
  );
  console.log(
    `\n${outstanding.length} need supervision, ${publishable.length} would publish, ` +
      `${withNote.length} of those have a note in your own words`,
  );

  if (process.argv.includes("--folders")) {
    const folders = tally(
      outstanding.flatMap((needle: Needle) => needle.folders.map((folder) => folder)),
    ).slice(0, 25);
    console.log("\nbiggest folders still outstanding:");
    for (const [folder, count] of folders) console.log(`  ${String(count).padStart(5)}  ${folder}`);
  }
}

void main();
