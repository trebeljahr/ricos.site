import fs from "node:fs";
import path from "node:path";
import Layout from "@components/Layout";
import Header, { PageMain } from "@components/PostHeader";
import clsx from "clsx";
import matter from "gray-matter";
import {
  type ChapterMeta,
  type ChapterProgress,
  chapterProgress,
  dailyWords,
  dayKey,
  type History,
  type NextUp,
  nextUp,
  type Pace,
  pace,
  recordDay,
  SERIES_DEADLINE,
  streak,
  WORDS_PER_SECTION,
} from "src/lib/computerSeries";

// A dev-only writing dashboard for the "how computers work" series: what to
// write next, how far each chapter is, and whether the deadline still holds.
// Reads the chapter files in src/content/Notes/computer/ on every request
// (getStaticProps reruns per request under `next dev`) and keeps one word
// total per day in .writing-progress.json, which is gitignored.

const SERIES_DIR =
  process.env.COMPUTER_SERIES_DIR ?? path.join("src", "content", "Notes", "computer");
const HISTORY_FILE = ".writing-progress.json";

type Props = {
  chapters: ChapterProgress[];
  pace: Pace;
  next: NextUp | null;
  today: number;
  streak: number;
  recent: { day: string; words: number }[];
  indexPath: string;
};

const obsidianLink = (file: string) => `obsidian://open?path=${encodeURIComponent(file)}`;
const fmt = (n: number) => n.toLocaleString("en-US");
const percent = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

function Bar({ value, max, className }: { value: number; max: number; className?: string }) {
  return (
    <div
      className={clsx("h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800", className)}
    >
      <div
        className="h-full rounded-full bg-accent"
        style={{ width: `${percent(Math.min(value, max), max)}%` }}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone?: "good" | "bad";
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p
        className={clsx(
          "mt-hair text-3xl font-bold tabular-nums",
          tone === "good" && "text-green-600 dark:text-green-400",
          tone === "bad" && "text-red-600 dark:text-red-400",
          !tone && "text-gray-900 dark:text-white",
        )}
      >
        {value}
      </p>
      <p className="mt-hair text-sm text-gray-600 dark:text-gray-300">{note}</p>
    </div>
  );
}

function NextUpCard({ next }: { next: NextUp | null }) {
  if (!next) {
    return (
      <p className="text-lg font-semibold">Every section has reached its target. Time to revise.</p>
    );
  }
  const { chapter, section } = next;
  return (
    <div className="rounded-lg border-2 border-accent p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Write next</p>
      <p className="mt-label text-sm text-gray-600 dark:text-gray-300">
        {chapter.number} · {chapter.kind === "aside" ? "Aside: " : ""}
        {chapter.title}
      </p>
      <p className="mt-hair text-2xl font-bold text-gray-900 dark:text-white">{section.heading}</p>
      <p className="mt-hair text-sm text-gray-600 dark:text-gray-300">
        {fmt(section.words)} of {fmt(section.target)} words in this section
      </p>
      <a
        href={obsidianLink(chapter.path)}
        className="mt-para inline-block rounded-md bg-accent px-5 py-2 font-semibold text-white no-underline hover:opacity-90"
      >
        Open in Obsidian
      </a>
    </div>
  );
}

function Recent({ recent, needed }: { recent: Props["recent"]; needed: number }) {
  if (recent.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Daily bars start tomorrow: the page records one word total per day you open it.
      </p>
    );
  }
  const max = Math.max(needed, ...recent.map((d) => d.words), 1);
  return (
    <div>
      <div className="flex h-24 items-end gap-hair">
        {recent.map((d) => (
          <div
            key={d.day}
            title={`${d.day}: ${fmt(d.words)} words`}
            className={clsx("flex-1 rounded-t", d.words >= needed ? "bg-green-500" : "bg-gray-400")}
            style={{ height: `${Math.max(percent(Math.max(d.words, 0), max), 2)}%` }}
          />
        ))}
      </div>
      <p className="mt-hair text-xs text-gray-500">
        Last {recent.length === 1 ? "day" : `${recent.length} days`}. Green bars met the{" "}
        {fmt(needed)} words a day the deadline needs now.
      </p>
    </div>
  );
}

function ChapterRow({ chapter }: { chapter: ChapterProgress }) {
  return (
    <details
      className={clsx(
        "border-b border-gray-200 py-label dark:border-gray-800",
        chapter.parent && "pl-6",
      )}
    >
      <summary className="grid cursor-pointer grid-cols-[3.5rem_1fr_auto] items-center gap-tight">
        <span className="font-mono text-sm text-gray-500">{chapter.number}</span>
        <span className="min-w-0">
          <span className="block truncate font-semibold text-gray-900 dark:text-white">
            {chapter.kind === "aside" && <span className="font-normal text-gray-500">Aside: </span>}
            {chapter.title}
          </span>
          <Bar value={chapter.credited} max={chapter.target} className="mt-hair" />
        </span>
        <span className="text-right text-sm tabular-nums text-gray-600 dark:text-gray-300">
          {fmt(chapter.words)} / {fmt(chapter.target)}
          <span className="block text-xs text-gray-500">{chapter.status}</span>
        </span>
      </summary>
      <div className="mt-label pl-14">
        <a href={obsidianLink(chapter.path)} className="text-sm font-semibold">
          Open in Obsidian
        </a>
        <ul className="not-prose mt-label grid gap-hair">
          {chapter.sections.map((s, i) => (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: the outline repeats headings; order is fixed
              key={`${i}-${s.heading}`}
              className="grid grid-cols-[1fr_6rem_4rem] items-center gap-tight text-sm"
              style={{ paddingLeft: `${(s.depth - 1) * 0.75}rem` }}
            >
              <span className="truncate">{s.heading}</span>
              <Bar value={s.words} max={s.target} />
              <span className="text-right tabular-nums text-gray-500">{fmt(s.words)}</span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

export default function WritingDevPage(props: Props) {
  const { chapters, pace: p, next, today, recent, indexPath } = props;
  const parts = [...new Set(chapters.map((c) => c.part))].map((part) => {
    const inPart = chapters.filter((c) => c.part === part);
    return {
      part,
      title: inPart[0].partTitle,
      chapters: inPart,
      credited: inPart.reduce((sum, c) => sum + c.credited, 0),
      target: inPart.reduce((sum, c) => sum + c.target, 0),
    };
  });

  return (
    <Layout
      title="Writing progress (dev)"
      description="A dev-only dashboard for writing the how computers work series."
      url="dev/writing"
      keywords={["dev"]}
      noindex
    >
      <PageMain>
        <article className="mx-auto max-w-5xl">
          <Header
            breadcrumbs={{ path: "dev/writing" }}
            title="How computers work"
            subtitle={`Writing progress. Goal: every section drafted by ${SERIES_DEADLINE}.`}
          />

          {chapters.length === 0 ? (
            <p className="not-prose mt-section">
              No chapter files found in <code>{SERIES_DIR}</code>.
            </p>
          ) : (
            <div className="not-prose">
              <section className="mt-section grid gap-para lg:grid-cols-[3fr_2fr]">
                <NextUpCard next={next} />
                <Recent recent={recent} needed={p.neededPerDay} />
              </section>

              <section className="mt-section grid gap-stack sm:grid-cols-2 lg:grid-cols-4">
                <Stat
                  label="Today"
                  value={fmt(today)}
                  note={`${props.streak}-day streak · ${fmt(p.neededPerDay)} needed`}
                  tone={today >= p.neededPerDay ? "good" : undefined}
                />
                <Stat
                  label={p.lead > 0 ? "Ahead" : p.lead < 0 ? "Behind" : "On pace"}
                  value={fmt(Math.abs(p.lead))}
                  note={`words against a straight line to ${SERIES_DEADLINE}, before today`}
                  tone={p.lead >= 0 ? "good" : "bad"}
                />
                <Stat
                  label="Needed per day"
                  value={fmt(p.neededPerDay)}
                  note={`${p.daysLeft} days left, today included`}
                />
                <Stat
                  label="Done"
                  value={`${percent(p.credited, p.target)}%`}
                  note={`${fmt(p.credited)} of ${fmt(p.target)} words (${WORDS_PER_SECTION} per section)`}
                />
              </section>

              {parts.map((part) => (
                <section key={part.part} className="mt-section">
                  <div className="mb-label flex items-baseline justify-between gap-tight">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Part {part.part}: {part.title}
                    </h2>
                    <span className="text-sm tabular-nums text-gray-500">
                      {percent(part.credited, part.target)}%
                    </span>
                  </div>
                  <Bar value={part.credited} max={part.target} className="mb-label" />
                  {part.chapters.map((chapter) => (
                    <ChapterRow key={chapter.path} chapter={chapter} />
                  ))}
                </section>
              ))}

              <p className="mt-section text-sm text-gray-500">
                Order, titles and status come from each file's frontmatter. Set{" "}
                <code>status: done</code> to count a chapter as finished whatever its word count.{" "}
                <a href={obsidianLink(indexPath)}>Open the index in Obsidian</a>.
              </p>
            </div>
          )}
        </article>
      </PageMain>
    </Layout>
  );
}

function readChapters(dir: string): ChapterProgress[] {
  if (!fs.existsSync(dir)) return [];
  const files = fs
    .readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((f) => /^part-[^/]+\/[^/]+\.md$/.test(f.split(path.sep).join("/")));
  return files
    .map((file) => {
      const full = path.resolve(dir, file);
      const { data, content } = matter(fs.readFileSync(full, "utf8"));
      return chapterProgress(data as ChapterMeta, content, full);
    })
    .sort((a, b) => a.order - b.order);
}

function readHistory(): History {
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8")) as History;
  } catch {
    return {};
  }
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") {
    return { notFound: true } as const;
  }
  const chapters = readChapters(SERIES_DIR);
  const todayKey = dayKey(new Date());
  const total = chapters.reduce((sum, c) => sum + c.words, 0);
  const history = chapters.length > 0 ? recordDay(readHistory(), todayKey, total) : readHistory();
  if (chapters.length > 0) {
    try {
      fs.writeFileSync(HISTORY_FILE, `${JSON.stringify(history, undefined, 2)}\n`);
    } catch (error) {
      console.warn(`Could not save ${HISTORY_FILE}:`, error);
    }
  }
  const daily = dailyWords(history);
  const props: Props = {
    chapters,
    pace: pace(chapters, todayKey),
    next: nextUp(chapters),
    today: daily.find((d) => d.day === todayKey)?.words ?? 0,
    streak: streak(history, todayKey),
    recent: daily.slice(-14),
    indexPath: path.resolve(SERIES_DIR, "index.md"),
  };
  return { props };
}
