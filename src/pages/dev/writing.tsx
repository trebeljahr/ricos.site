import fs from "node:fs";
import path from "node:path";
import Layout from "@components/Layout";
import Header, { PageMain } from "@components/PostHeader";
import clsx from "clsx";
import matter from "gray-matter";
import { type ReactNode, useState } from "react";
import {
  bestStreak,
  type CalendarDay,
  type ChapterMeta,
  type ChapterProgress,
  calendar,
  chapterProgress,
  dailyWords,
  dayKey,
  type History,
  type NextUp,
  nextUp,
  type Pace,
  pace,
  progressColor,
  recordDay,
  SERIES_DEADLINE,
  streak,
} from "src/lib/computerSeries";
import { CHAPTER_FILE } from "src/lib/computerSeriesLinks";

// A dev-only writing dashboard for the "how computers work" series: what to
// write next, how far each chapter is, and whether the deadline still holds.
// Reads the chapter files in src/content/Notes/computer/ on every request
// (getStaticProps reruns per request under `next dev`) and keeps one word
// total per day in .writing-progress.json, which is gitignored.

// Server-only: computed inside getStaticProps, because `path` is an empty stub
// in the browser bundle and calling it at module level stops hydration.
const seriesDir = () =>
  process.env.COMPUTER_SERIES_DIR ?? path.join("src", "content", "Notes", "computer");
const HISTORY_FILE = ".writing-progress.json";

type Props = {
  chapters: ChapterProgress[];
  pace: Pace;
  next: NextUp | null;
  today: number;
  streak: number;
  best: number;
  days: CalendarDay[];
  todayKey: string;
  indexPath: string;
  seriesDir: string;
};

const obsidianLink = (file: string) => `obsidian://open?path=${encodeURIComponent(file)}`;
const siteLink = (chapter: ChapterProgress) =>
  chapter.slug ? `/computer/${chapter.slug}` : undefined;
const fmt = (n: number) => n.toLocaleString("en-US");
const percent = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

function Bar({
  value,
  max,
  className,
  thick,
}: {
  value: number;
  max: number;
  className?: string;
  thick?: boolean;
}) {
  const fraction = max ? Math.min(value, max) / max : 0;
  return (
    <div
      className={clsx(
        "overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800",
        thick ? "h-3" : "h-2",
        className,
      )}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${fraction * 100}%`, backgroundColor: progressColor(fraction) }}
      />
    </div>
  );
}

function OpenLinks({
  chapter,
  size = "small",
}: {
  chapter: ChapterProgress;
  size?: "small" | "big";
}) {
  const site = siteLink(chapter);
  const base =
    size === "big"
      ? "rounded-md px-5 py-2 font-semibold no-underline"
      : "rounded px-3 py-1 text-sm font-semibold no-underline";
  return (
    <div className="flex flex-wrap gap-tight">
      <a
        href={obsidianLink(chapter.path)}
        className={clsx(base, "bg-accent text-white hover:opacity-90 dark:text-gray-950")}
      >
        Open in Obsidian
      </a>
      {site && (
        <a
          href={site}
          target="_blank"
          rel="noreferrer"
          className={clsx(
            base,
            "border border-gray-300 text-gray-800 hover:border-accent dark:border-gray-600 dark:text-gray-100",
          )}
        >
          Open on website
        </a>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  note,
  tone,
  children,
}: {
  label: string;
  value: string;
  note: string;
  tone?: "good" | "bad";
  children?: ReactNode;
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
      {children}
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
      <Bar value={section.words} max={section.target} className="mt-label" />
      <div className="mt-para">
        <OpenLinks chapter={chapter} size="big" />
      </div>
    </div>
  );
}

/** A half-circle gauge: how much of today's word budget is written. */
function DailyMeter({ today, needed, streak }: { today: number; needed: number; streak: number }) {
  const fraction = needed > 0 ? today / needed : 1;
  const shown = Math.min(fraction, 1);
  const radius = 80;
  const arc = Math.PI * radius;
  const color = progressColor(shown);
  return (
    <div className="flex flex-col items-center rounded-lg border border-gray-200 p-5 dark:border-gray-700">
      <p className="self-start text-xs font-semibold uppercase tracking-wide text-gray-500">
        Today's budget
      </p>
      <svg
        viewBox="0 0 200 112"
        className="mt-label w-full max-w-xs"
        role="img"
        aria-label={`${percent(today, needed)}% of today's words`}
      >
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          strokeWidth="18"
          strokeLinecap="round"
          className="stroke-gray-200 dark:stroke-gray-800"
        />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={color}
          strokeWidth="18"
          strokeLinecap="round"
          strokeDasharray={`${arc * shown} ${arc}`}
          className="transition-[stroke-dasharray] duration-700"
          style={fraction >= 1 ? { filter: `drop-shadow(0 0 6px ${color})` } : undefined}
        />
        <text
          x="100"
          y="88"
          textAnchor="middle"
          className="fill-gray-900 text-[34px] font-bold dark:fill-white"
        >
          {percent(today, needed)}%
        </text>
      </svg>
      <p className="mt-hair text-sm tabular-nums text-gray-600 dark:text-gray-300">
        {fmt(today)} of {fmt(needed)} words
        {fraction >= 1 ? " · done for today" : ` · ${fmt(Math.max(needed - today, 0))} to go`}
      </p>
      <p className="mt-hair text-xs text-gray-500">
        {streak > 0 ? `${streak}-day streak` : "No streak yet"}
      </p>
    </div>
  );
}

type PartSummary = { part: number; title: string; credited: number; target: number };

/** The whole series as one track: a segment per part, as wide as its share of the target. */
function GlobalTrack({
  parts,
  credited,
  target,
}: {
  parts: PartSummary[];
  credited: number;
  target: number;
}) {
  return (
    <section className="mt-para rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <div className="mb-label flex items-baseline justify-between gap-tight">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Whole series</p>
        <p className="text-sm tabular-nums text-gray-600 dark:text-gray-300">
          <span
            className="font-bold"
            style={{ color: progressColor(target ? credited / target : 0) }}
          >
            {percent(credited, target)}%
          </span>{" "}
          · {fmt(credited)} of {fmt(target)} words
        </p>
      </div>
      <div className="flex gap-hair">
        {parts.map((p) => (
          <div
            key={p.part}
            className="min-w-0"
            style={{ flex: `${p.target} 1 0` }}
            title={`Part ${p.part}: ${p.title} · ${percent(p.credited, p.target)}%`}
          >
            <Bar value={p.credited} max={p.target} thick />
          </div>
        ))}
      </div>
      <ul className="mt-label flex flex-wrap gap-x-para gap-y-hair text-xs text-gray-500">
        {parts.map((p) => (
          <li key={p.part} className="flex items-center gap-hair">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: progressColor(p.target ? p.credited / p.target : 0) }}
            />
            {p.part}. {p.title} · {percent(p.credited, p.target)}%
          </li>
        ))}
      </ul>
    </section>
  );
}

const WEEKDAYS = ["Mon", "", "Wed", "", "Fri", "", "Sun"];

/** GitHub-style grid: one square per day, darker green the more of the daily budget was written. */
function StreakGrid({
  days,
  todayKey,
  needed,
  streak,
  best,
}: {
  days: CalendarDay[];
  todayKey: string;
  needed: number;
  streak: number;
  best: number;
}) {
  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  const hit = days.filter((d) => (d.words ?? 0) >= needed && needed > 0).length;
  const written = days.filter((d) => (d.words ?? 0) > 0).length;
  const cellColor = (d: CalendarDay) => {
    if (!d.inRange) return undefined;
    if (d.words === null || d.words <= 0) return undefined;
    return progressColor(Math.min(d.words / Math.max(needed, 1), 1) * 0.75 + 0.25);
  };
  return (
    <section className="mt-section">
      <div className="mb-label flex flex-wrap items-baseline justify-between gap-tight">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Days</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {streak}-day streak · best {best} · {written} days written · {hit} at budget
        </p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <div className="inline-grid grid-cols-[2rem_auto] gap-tight">
          <div />
          <div className="flex gap-[3px] text-xs text-gray-500">
            {weeks.map((week) => {
              const firstOfMonth = week.find((d) => d.day.endsWith("-01"));
              const label = firstOfMonth ?? (week === weeks[0] ? week[0] : undefined);
              return (
                <span key={week[0].day} className="w-4 overflow-visible whitespace-nowrap">
                  {label
                    ? new Date(`${label.day}T12:00:00Z`).toLocaleString("en-US", {
                        month: "short",
                        timeZone: "UTC",
                      })
                    : ""}
                </span>
              );
            })}
          </div>
          <div className="grid grid-rows-7 gap-[3px] text-[10px] leading-4 text-gray-500">
            {WEEKDAYS.map((label, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed list of seven rows
              <span key={i}>{label}</span>
            ))}
          </div>
          <div className="flex gap-[3px]">
            {weeks.map((week) => (
              <div key={week[0].day} className="grid grid-rows-7 gap-[3px]">
                {week.map((d) => (
                  <div
                    key={d.day}
                    title={
                      d.inRange
                        ? `${d.day}: ${d.words === null ? "to come" : `${fmt(d.words)} words`}`
                        : d.day
                    }
                    className={clsx(
                      "size-4 rounded-[3px]",
                      !d.inRange && "opacity-0",
                      d.inRange && !cellColor(d) && !d.future && "bg-gray-200 dark:bg-gray-800",
                      d.future && "border border-dashed border-gray-300 dark:border-gray-700",
                      d.day === todayKey &&
                        "ring-2 ring-accent ring-offset-1 ring-offset-white dark:ring-offset-gray-950",
                    )}
                    style={{ backgroundColor: cellColor(d) }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-label flex items-center gap-hair text-xs text-gray-500">
          <span>Less</span>
          <span className="size-3 rounded-[3px] bg-gray-200 dark:bg-gray-800" />
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <span
              key={f}
              className="size-3 rounded-[3px]"
              style={{ backgroundColor: progressColor(f) }}
            />
          ))}
          <span>
            More · full green = the day's budget ({fmt(needed)} words). Days you don't open this
            page count towards the next day you do.
          </span>
        </div>
      </div>
    </section>
  );
}

function ChapterRow({ chapter }: { chapter: ChapterProgress }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={clsx(
        "border-b border-gray-200 py-label dark:border-gray-800",
        chapter.parent && "pl-6",
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="grid w-full cursor-pointer grid-cols-[1rem_3.5rem_1fr_auto] items-center gap-tight text-left"
      >
        <span
          aria-hidden="true"
          className={clsx(
            "text-gray-400 transition-transform duration-300 motion-reduce:transition-none",
            open && "rotate-90",
          )}
        >
          ▸
        </span>
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
      </button>
      <div
        className={clsx(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden" inert={!open}>
          <div className="pl-20 pt-label">
            <OpenLinks chapter={chapter} />
            <ul className="mt-label grid gap-hair">
              {chapter.sections.map((s, i) => (
                <li
                  // biome-ignore lint/suspicious/noArrayIndexKey: the outline repeats headings; order is fixed
                  key={`${i}-${s.heading}`}
                  className="grid grid-cols-[1fr_6rem_6rem] items-center gap-tight text-sm"
                  style={{ paddingLeft: `${(s.depth - 1) * 0.75}rem` }}
                >
                  <span className="truncate">{s.heading}</span>
                  <Bar value={s.words} max={s.target} />
                  <span className="text-right tabular-nums text-gray-500">
                    {fmt(s.words)} / {fmt(s.target)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WritingDevPage(props: Props) {
  const { chapters, pace: p, next, today, indexPath } = props;
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
              No chapter files found in <code>{props.seriesDir}</code>.
            </p>
          ) : (
            <div className="not-prose">
              <section className="mt-section grid gap-para lg:grid-cols-[3fr_2fr]">
                <NextUpCard next={next} />
                <DailyMeter today={today} needed={p.neededPerDay} streak={props.streak} />
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
                  note="against per-section estimates"
                >
                  <Bar value={p.credited} max={p.target} className="mt-label" />
                </Stat>
              </section>

              <GlobalTrack parts={parts} credited={p.credited} target={p.target} />

              <StreakGrid
                days={props.days}
                todayKey={props.todayKey}
                needed={p.neededPerDay}
                streak={props.streak}
                best={props.best}
              />

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
                  <Bar value={part.credited} max={part.target} className="mb-label" thick />
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
    .filter((f) => CHAPTER_FILE.test(f.split(path.sep).join("/")));
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
  const dir = seriesDir();
  const chapters = readChapters(dir);
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
    best: bestStreak(daily),
    days: calendar(daily, todayKey),
    todayKey,
    indexPath: path.resolve(dir, "Index.md"),
    seriesDir: dir,
  };
  return { props };
}
