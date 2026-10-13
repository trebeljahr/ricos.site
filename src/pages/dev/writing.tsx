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
  LOCK_STEP,
  type NextUp,
  nextUp,
  type Pace,
  pace,
  progressColor,
  recordDay,
  SERIES_DEADLINE,
  streak,
  type Tally,
  tallyByKind,
} from "src/lib/computerSeries";
import { CHAPTER_FILE } from "src/lib/computerSeriesLinks";
import {
  type Catalog,
  formatMinutes,
  type ResourceKind,
  type StudyDone,
  type StudyItem,
  type StudyPlan,
  setStudied,
  studyPlan,
  withDone,
} from "src/lib/computerSeriesResources";
import { readStudyDone } from "src/lib/computerSeriesStudyStore";

// A dev-only writing dashboard for the "how computers work" series: what to
// write next, how far each chapter is, and whether the deadline still holds.
// Reads the chapter files in src/content/Notes/computer/ on every request
// (getStaticProps reruns per request under `next dev`) and keeps one word
// total per day in .writing-progress.json, which is gitignored. An open tab
// follows the files: see trackChapterEdits below. Each chapter also shows what
// to read and watch before writing it, from src/content/computer/resources.json
// (keyed by the chapter's slug); ticks go to .study-progress.json through
// /api/dev/study.

// Server-only: computed inside getStaticProps, because `path` is an empty stub
// in the browser bundle and calling it at module level stops hydration.
const seriesDir = () =>
  process.env.COMPUTER_SERIES_DIR ?? path.join("src", "content", "Notes", "computer");
const HISTORY_FILE = ".writing-progress.json";
const CATALOG_FILE = path.join("src", "content", "computer", "resources.json");

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
  /** Study lists by chapter slug, without ticks; `done` carries those. */
  plans: Record<string, StudyPlan>;
  done: StudyDone;
};

type Toggle = (id: string, studied: boolean) => void;

const obsidianLink = (file: string) => `obsidian://open?path=${encodeURIComponent(file)}`;
const siteLink = (chapter: ChapterProgress) =>
  chapter.slug ? `/computer/${chapter.slug}` : undefined;
const fmt = (n: number) => n.toLocaleString("en-US");
const percent = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

type KindTally = Record<ChapterMeta["kind"], Tally>;

/** What a bar follows: the chapters, which are written first, or the asides where there are none. */
const leading = (tally: KindTally) => (tally.chapter.count > 0 ? tally.chapter : tally.aside);
const tallyColor = (tally: Tally) =>
  progressColor(tally.target ? tally.credited / tally.target : 0);

/** "chapters 40% · asides 0%", or one number where only one kind exists. */
function splitPercent({ chapter, aside }: KindTally) {
  const of = (tally: Tally) => `${percent(tally.credited, tally.target)}%`;
  if (aside.count === 0) return of(chapter);
  if (chapter.count === 0) return `asides ${of(aside)}`;
  return `chapters ${of(chapter)} · asides ${of(aside)}`;
}

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
  // A drafted section can lock in at a target of zero, which is met.
  const fraction = max ? Math.min(value, max) / max : 1;
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

const KIND_VERB: Record<ResourceKind, string> = {
  video: "Watch",
  article: "Read",
  book: "Book",
  paper: "Paper",
  reference: "Look up",
  interactive: "Play",
  course: "Course",
  tool: "Tool",
  code: "Code",
};

function StudyRow({ item, onToggle }: { item: StudyItem; onToggle: Toggle }) {
  const meta = [item.by, item.minutes ? formatMinutes(item.minutes) : undefined].filter(Boolean);
  return (
    <li className="grid grid-cols-[1rem_4.5rem_1fr] items-baseline gap-tight text-sm">
      <input
        type="checkbox"
        checked={Boolean(item.done)}
        onChange={(event) => onToggle(item.id, event.target.checked)}
        aria-label={`Done: ${item.title}`}
        className="size-4 translate-y-0.5 cursor-pointer accent-accent"
      />
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {KIND_VERB[item.kind]}
      </span>
      <span className={clsx("min-w-0", item.done && "opacity-50")}>
        {item.url ? (
          <a href={item.url} target="_blank" rel="noreferrer" className="font-medium">
            {item.title}
          </a>
        ) : (
          <span className="font-medium">{item.title}</span>
        )}
        {meta.length > 0 && <span className="text-gray-500"> · {meta.join(" · ")}</span>}
        {item.note && <span className="block text-xs text-gray-500">{item.note}</span>}
      </span>
    </li>
  );
}

/** "3 of 7 core items done · 54 min of video left". */
function studySummary(plan: StudyPlan) {
  const left = plan.minutesLeft ? ` · ${formatMinutes(plan.minutesLeft)} of video left` : "";
  return `${plan.coreDone} of ${plan.core.length} core items done${left}`;
}

/** What to read and watch before writing a chapter, and the questions to try cold afterwards. */
function StudyPanel({ plan, onToggle }: { plan: StudyPlan; onToggle: Toggle }) {
  const [deeper, setDeeper] = useState(false);
  return (
    <div className="mt-para border-t border-gray-200 pt-label dark:border-gray-800">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        Study first{plan.core.length > 0 && ` · ${studySummary(plan)}`}
      </p>
      {plan.note && <p className="mt-hair text-xs text-gray-500">{plan.note}</p>}
      {plan.core.length > 0 && (
        <ul className="mt-label grid gap-tight">
          {plan.core.map((item) => (
            <StudyRow key={item.id} item={item} onToggle={onToggle} />
          ))}
        </ul>
      )}
      {plan.deeper.length > 0 && (
        <>
          <button
            type="button"
            aria-expanded={deeper}
            onClick={() => setDeeper((d) => !d)}
            className="mt-label cursor-pointer text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-accent"
          >
            {deeper ? "▾" : "▸"} Deeper, if stuck or curious ({plan.deeper.length})
          </button>
          {deeper && (
            <ul className="mt-label grid gap-tight">
              {plan.deeper.map((item) => (
                <StudyRow key={item.id} item={item} onToggle={onToggle} />
              ))}
            </ul>
          )}
        </>
      )}
      {plan.questions.length > 0 && (
        <>
          <p className="mt-para text-xs font-semibold uppercase tracking-wide text-gray-500">
            Can you answer these without looking?
          </p>
          <ul className="mt-label grid list-disc gap-hair pl-5 text-sm">
            {plan.questions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function NextUpCard({
  next,
  plan,
  onToggle,
}: {
  next: NextUp | null;
  plan?: StudyPlan;
  onToggle: Toggle;
}) {
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
      {plan && plan.core.length > 0 && <NextUpStudy plan={plan} onToggle={onToggle} />}
    </div>
  );
}

/** The core items still open for the chapter that is written next. */
function NextUpStudy({ plan, onToggle }: { plan: StudyPlan; onToggle: Toggle }) {
  const open = plan.core.filter((item) => !item.done);
  const shown = open.slice(0, 4);
  return (
    <div className="mt-para border-t border-gray-200 pt-label dark:border-gray-700">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        Study first · {studySummary(plan)}
      </p>
      {shown.length > 0 && (
        <ul className="mt-label grid gap-tight">
          {shown.map((item) => (
            <StudyRow key={item.id} item={item} onToggle={onToggle} />
          ))}
        </ul>
      )}
      {open.length > shown.length && (
        <p className="mt-label text-xs text-gray-500">
          {open.length - shown.length} more, with the questions, in the chapter's row below.
        </p>
      )}
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

type PartSummary = { part: number; title: string; tally: KindTally };

/**
 * The whole series as one track in writing order: a segment for each part's
 * chapters, then one for all the asides, each as wide as its share of the target.
 */
function GlobalTrack({
  parts,
  tally,
  credited,
  target,
}: {
  parts: PartSummary[];
  tally: KindTally;
  credited: number;
  target: number;
}) {
  const segments = parts
    .filter((p) => p.tally.chapter.count > 0)
    .map((p) => ({
      key: `part-${p.part}`,
      name: `Part ${p.part}: ${p.title}`,
      short: `${p.part}. ${p.title}`,
      tally: p.tally.chapter,
    }));
  if (tally.aside.count > 0) {
    segments.push({ key: "asides", name: "Asides", short: "Asides", tally: tally.aside });
  }
  return (
    <section className="mt-para rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <div className="mb-label flex items-baseline justify-between gap-tight">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Whole series</p>
        <p className="text-sm tabular-nums text-gray-600 dark:text-gray-300">
          <span className="font-bold" style={{ color: tallyColor(leading(tally)) }}>
            {splitPercent(tally)}
          </span>{" "}
          · {fmt(credited)} of {fmt(target)} words
        </p>
      </div>
      <div className="flex gap-hair">
        {segments.map((s) => (
          <div
            key={s.key}
            className="min-w-0"
            style={{ flex: `${s.tally.target} 1 0` }}
            title={`${s.name} · ${percent(s.tally.credited, s.tally.target)}%`}
          >
            <Bar value={s.tally.credited} max={s.tally.target} thick />
          </div>
        ))}
      </div>
      <ul className="mt-label flex flex-wrap gap-x-para gap-y-hair text-xs text-gray-500">
        {segments.map((s) => (
          <li key={s.key} className="flex items-center gap-hair">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: tallyColor(s.tally) }}
            />
            {s.short} · {percent(s.tally.credited, s.tally.target)}%
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

function ChapterRow({
  chapter,
  plan,
  onToggle,
}: {
  chapter: ChapterProgress;
  plan?: StudyPlan;
  onToggle: Toggle;
}) {
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
          <span className="block text-xs text-gray-500">
            {chapter.status}
            {plan && plan.core.length > 0 && ` · study ${plan.coreDone}/${plan.core.length}`}
          </span>
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
            {plan && <StudyPanel plan={plan} onToggle={onToggle} />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WritingDevPage(props: Props) {
  const { chapters, pace: p, next, today, indexPath } = props;
  const [done, setDone] = useState(props.done);
  const planFor = (chapter: ChapterProgress) => {
    const plan = chapter.slug ? props.plans[chapter.slug] : undefined;
    return plan && withDone(plan, done);
  };
  // Tick at once, then save; a failed save takes the tick back.
  const toggle: Toggle = (id, studied) => {
    const before = done;
    setDone(setStudied(done, id, studied, props.todayKey));
    fetch("/api/dev/study", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, done: studied }),
    })
      .then((response) => {
        if (!response.ok) throw new Error(`${response.status}`);
      })
      .catch((error) => {
        console.warn("Could not save the study tick:", error);
        setDone(before);
      });
  };
  const parts = [...new Set(chapters.map((c) => c.part))].map((part) => {
    const inPart = chapters.filter((c) => c.part === part);
    return { part, title: inPart[0].partTitle, chapters: inPart, tally: tallyByKind(inPart) };
  });
  const tally = tallyByKind(chapters);

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
                <NextUpCard
                  next={next}
                  plan={next ? planFor(next.chapter) : undefined}
                  onToggle={toggle}
                />
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
                  note="chapters and asides, against per-section estimates"
                >
                  <Bar value={p.credited} max={p.target} className="mt-label" />
                </Stat>
              </section>

              <GlobalTrack parts={parts} tally={tally} credited={p.credited} target={p.target} />

              <StreakGrid
                days={props.days}
                todayKey={props.todayKey}
                needed={p.neededPerDay}
                streak={props.streak}
                best={props.best}
              />

              {parts.map((part) => (
                <section key={part.part} className="mt-section">
                  <div className="mb-label flex flex-wrap items-baseline justify-between gap-tight">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Part {part.part}: {part.title}
                    </h2>
                    <span className="text-sm tabular-nums text-gray-500">
                      {splitPercent(part.tally)}
                    </span>
                  </div>
                  <Bar
                    value={leading(part.tally).credited}
                    max={leading(part.tally).target}
                    className="mb-label"
                    thick
                  />
                  {part.chapters.map((chapter) => (
                    <ChapterRow
                      key={chapter.path}
                      chapter={chapter}
                      plan={planFor(chapter)}
                      onToggle={toggle}
                    />
                  ))}
                </section>
              ))}

              <p className="mt-section text-sm text-gray-500">
                Order, titles and status come from each file's frontmatter. "Write next" takes the
                chapters first, in that order, and the asides after the last chapter, so each bar
                follows the chapters and the asides are counted apart. Set{" "}
                <code>status: draft-done</code> (or <code>revising</code>, <code>done</code>) to
                count a chapter as finished: each section short of its estimate then takes its own
                word count, rounded down to {LOCK_STEP}, as its target. The study lists come from{" "}
                <code>src/content/computer/resources.json</code>, by chapter slug; ticks are saved
                in <code>.study-progress.json</code>.{" "}
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

function readCatalog(): Catalog {
  try {
    return JSON.parse(fs.readFileSync(CATALOG_FILE, "utf8")) as Catalog;
  } catch (error) {
    console.warn(`Could not read ${CATALOG_FILE}:`, error);
    return { resources: {}, chapters: {} };
  }
}

function readHistory(): History {
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8")) as History;
  } catch {
    return {};
  }
}

// Live reload in dev, the same way src/lib/loadVeliteData.ts does it for
// content pages: src/scripts/dev/watchVeliteHmr.ts rewrites this stamp when a
// chapter file's text changes, and because the require is static, Turbopack
// re-evaluates the page and the router refetches getStaticProps in the open
// tab. It does not wait for Velite, so a chapter that does not compile as MDX
// yet still counts.
function trackChapterEdits() {
  try {
    require("../../../.velite/hmr/writing.json");
  } catch {
    // The stamp only exists once next.config.mjs has run.
  }
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") {
    return { notFound: true } as const;
  }
  trackChapterEdits();
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
  const catalog = readCatalog();
  const plans: Props["plans"] = {};
  for (const chapter of chapters) {
    const plan = studyPlan(chapter.slug, catalog);
    if (plan && chapter.slug) plans[chapter.slug] = plan;
  }
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
    plans,
    done: readStudyDone(),
  };
  return { props };
}
