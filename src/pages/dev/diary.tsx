import Layout from "@components/Layout";
import Header, { PageMain } from "@components/PostHeader";
import clsx from "clsx";
import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { type CalendarDay, calendar, dayKey, progressColor } from "src/lib/computerSeries";
import {
  type Candidate,
  DIARY_LOG_FILE,
  type DiaryStats,
  dailyOrder,
  diaryStats,
  KIND_LABEL,
  readToday,
  todaysPick,
  wordsByDay,
} from "src/lib/diary";
import {
  clientAddresses,
  readEntries,
  readLog,
  readMorningPage,
  servesPrivateNotes,
  textsDir,
} from "src/lib/diaryStore";

// A dev-only reading loop for Rico's own writing: write today's morning page,
// then read one old entry (diary, morning page, weekly retro, dream, essay or
// a stretch of tiny thoughts) and edit it in place if something wants
// changing. The pick is the same all day; see dailyOrder in src/lib/diary.ts.
// Reads and skips go to Notes/texts/diary-progress.json through /api/dev/diary.
//
// Private: getServerSideProps 404s outside `next dev`, on Vercel and for any
// request from another machine, and next.config.mjs keeps Notes/texts out of
// every deployed function.

type ReadEntry = { id: string; title: string; words: number };

type Props = {
  todayKey: string;
  dir: string;
  entries: number;
  morning: { path: string; words: number | null };
  pick: Candidate | null;
  read: ReadEntry[];
  stats: DiaryStats;
  wrote: CalendarDay[];
  readDays: CalendarDay[];
};

const WEEKS = 16;
/** A full green square in the grids. */
const FULL_DAY = 1000;

const fmt = (n: number) => n.toLocaleString("en-US");
const percent = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);
const minutes = (words: number) => Math.max(1, Math.round(words / 230));
const obsidianOpen = (file: string) => `obsidian://open?path=${encodeURIComponent(file)}`;
const obsidianNew = (file: string) => `obsidian://new?path=${encodeURIComponent(file)}`;
const longDate = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

const button =
  "rounded-md px-4 py-2 text-sm font-semibold no-underline disabled:cursor-wait disabled:opacity-60";
const primary = clsx(button, "bg-accent text-white hover:opacity-90 dark:text-gray-950");
const secondary = clsx(
  button,
  "border border-gray-300 text-gray-800 hover:border-accent dark:border-gray-600 dark:text-gray-100",
);

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-hair text-3xl font-bold tabular-nums text-gray-900 dark:text-white">
        {value}
      </p>
      <p className="mt-hair text-sm text-gray-600 dark:text-gray-300">{note}</p>
    </div>
  );
}

function WriteCard({ morning, todayKey }: { morning: Props["morning"]; todayKey: string }) {
  const written = morning.words !== null && morning.words > 0;
  return (
    <div className="rounded-lg border border-gray-200 p-5 dark:border-gray-700">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">1 · Write</p>
      <p className="mt-label text-lg font-semibold text-gray-900 dark:text-white">
        {written ? `Morning page: ${fmt(morning.words ?? 0)} words` : "No morning page yet today"}
      </p>
      <p className="mt-hair text-sm text-gray-600 dark:text-gray-300">{longDate(todayKey)}</p>
      <a
        href={morning.words === null ? obsidianNew(morning.path) : obsidianOpen(morning.path)}
        className={clsx("mt-label inline-block", written ? secondary : primary)}
      >
        {morning.words === null ? "Start it in Obsidian" : "Open in Obsidian"}
      </a>
    </div>
  );
}

function ReadCard({
  read,
  showing,
  onMore,
  onUndo,
  busy,
}: {
  read: ReadEntry[];
  showing: boolean;
  onMore: () => void;
  onUndo: (id: string) => void;
  busy: boolean;
}) {
  const words = read.reduce((sum, r) => sum + r.words, 0);
  return (
    <div className="rounded-lg border border-gray-200 p-5 dark:border-gray-700">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">2 · Read</p>
      {read.length === 0 ? (
        <p className="mt-label text-lg font-semibold text-gray-900 dark:text-white">
          One entry from your past self, below
        </p>
      ) : (
        <>
          <p className="mt-label text-lg font-semibold text-gray-900 dark:text-white">
            Read today: {fmt(words)} words
          </p>
          <ul className="mt-hair text-sm text-gray-600 dark:text-gray-300">
            {read.map((r) => (
              <li key={r.id} className="flex items-baseline justify-between gap-tight">
                <span>
                  {r.title} · {fmt(r.words)} words
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onUndo(r.id)}
                  className="text-xs text-gray-500 underline hover:text-accent"
                >
                  undo
                </button>
              </li>
            ))}
          </ul>
          {!showing && (
            <button type="button" onClick={onMore} className={clsx("mt-label", secondary)}>
              Read one more
            </button>
          )}
        </>
      )}
    </div>
  );
}

// Images in the texts point into Obsidian or Notion exports, not at anything
// this server can show.
const readerComponents = { img: () => null };

function Reader({
  pick,
  busy,
  onRead,
  onSkip,
}: {
  pick: Candidate;
  busy: boolean;
  onRead: () => void;
  onSkip: () => void;
}) {
  const { entry, reason } = pick;
  const meta = [
    KIND_LABEL[entry.kind],
    entry.date ? longDate(entry.date) : null,
    entry.part ? `part ${entry.part.index} of ${entry.part.count}` : null,
    entry.fullWords && entry.fullWords > entry.words
      ? `${fmt(entry.words)} of ${fmt(entry.fullWords)} words · ${minutes(entry.words)} min`
      : `${fmt(entry.words)} words · ${minutes(entry.words)} min`,
  ].filter(Boolean);
  return (
    <section id="reading" className="mt-section">
      <div className="not-prose">
        <p className="text-sm font-semibold text-accent">{reason}</p>
        <h2 className="mt-hair text-3xl font-bold text-gray-900 dark:text-white">{entry.title}</h2>
        <p className="mt-hair text-sm text-gray-500">{meta.join(" · ")}</p>
      </div>
      <div className="mt-group max-w-prose break-words border-l-2 border-gray-200 pl-6 dark:border-gray-700">
        <Markdown remarkPlugins={[remarkGfm]} components={readerComponents}>
          {entry.body}
        </Markdown>
      </div>
      <div className="not-prose mt-group flex flex-wrap gap-tight border-t border-gray-200 pt-para dark:border-gray-700">
        <button type="button" disabled={busy} onClick={onRead} className={primary}>
          Mark as read
        </button>
        <a href={obsidianOpen(entry.path)} className={secondary}>
          Edit in Obsidian
        </a>
        <button type="button" disabled={busy} onClick={onSkip} className={secondary}>
          Something else
        </button>
      </div>
    </section>
  );
}

const WEEKDAYS = ["Mon", "", "Wed", "", "Fri", "", "Sun"];

function DayGrid({
  label,
  days,
  todayKey,
}: {
  label: string;
  days: CalendarDay[];
  todayKey: string;
}) {
  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  const color = (d: CalendarDay) =>
    d.words ? progressColor(Math.min(d.words / FULL_DAY, 1) * 0.75 + 0.25) : undefined;
  return (
    <div>
      <p className="mb-label text-sm font-semibold text-gray-700 dark:text-gray-200">{label}</p>
      <div className="inline-grid grid-cols-[2rem_auto] gap-tight">
        <div className="grid grid-rows-7 gap-[3px] text-[10px] leading-4 text-gray-500">
          {WEEKDAYS.map((day, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed list of seven rows
            <span key={i}>{day}</span>
          ))}
        </div>
        <div className="flex gap-[3px]">
          {weeks.map((week) => (
            <div key={week[0].day} className="grid grid-rows-7 gap-[3px]">
              {week.map((d) => (
                <div
                  key={d.day}
                  title={d.inRange ? `${d.day}: ${fmt(d.words ?? 0)} words` : d.day}
                  className={clsx(
                    "size-4 rounded-[3px]",
                    !d.inRange && "opacity-0",
                    d.inRange && !color(d) && "bg-gray-200 dark:bg-gray-800",
                    d.day === todayKey &&
                      "ring-2 ring-accent ring-offset-1 ring-offset-white dark:ring-offset-gray-950",
                  )}
                  style={{ backgroundColor: color(d) }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DiaryDevPage(props: Props) {
  const { pick, read, stats, todayKey } = props;
  const router = useRouter();
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);

  const send = async (id: string, action: "read" | "skip" | "undo", words = 0) => {
    setBusy(true);
    try {
      const response = await fetch("/api/dev/diary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, words }),
      });
      if (!response.ok) throw new Error(`${response.status}`);
      if (action === "read") setMore(false);
      await router.replace(router.asPath, undefined, { scroll: false });
      if (action === "skip") document.getElementById("reading")?.scrollIntoView();
    } catch (error) {
      console.warn("Could not save to the diary log:", error);
    } finally {
      setBusy(false);
    }
  };

  const showing = read.length === 0 || more;
  const ratio = stats.written ? stats.read / stats.written : 0;

  return (
    <Layout
      title="Diary (dev)"
      description="A dev-only loop for writing a morning page and reading an old entry."
      url="dev/diary"
      keywords={["dev"]}
      noindex
    >
      <PageMain>
        <article className="mx-auto max-w-5xl">
          <Header
            breadcrumbs={{ path: "dev/diary" }}
            title="Diary"
            subtitle="Write today's page, then read one from the past."
          />

          {props.entries === 0 ? (
            <p className="not-prose mt-section break-words">
              No entries found in <code>{props.dir}</code>.
            </p>
          ) : (
            <>
              <section className="not-prose mt-section grid gap-para md:grid-cols-2">
                <WriteCard morning={props.morning} todayKey={todayKey} />
                <ReadCard
                  read={read}
                  showing={showing}
                  onMore={() => setMore(true)}
                  onUndo={(id) => send(id, "undo")}
                  busy={busy}
                />
              </section>

              {showing &&
                (pick ? (
                  <Reader
                    pick={pick}
                    busy={busy}
                    onRead={() => send(pick.entry.id, "read", pick.entry.words)}
                    onSkip={() => send(pick.entry.id, "skip", pick.entry.words)}
                  />
                ) : (
                  <p className="not-prose mt-section">Nothing left to read today.</p>
                ))}

              <section className="not-prose mt-section grid gap-stack sm:grid-cols-2 lg:grid-cols-4">
                <Stat
                  label="Written"
                  value={fmt(stats.written)}
                  note={`words in the last 30 days, on ${stats.daysWritten} days`}
                />
                <Stat
                  label="Read again"
                  value={fmt(stats.read)}
                  note={`words in the last 30 days, on ${stats.daysRead} days`}
                />
                <Stat label="Read per written word" value={ratio.toFixed(2)} note="last 30 days" />
                <Stat
                  label="Archive met"
                  value={`${percent(stats.wordsMet, stats.words)}%`}
                  note={`${fmt(stats.entriesMet)} of ${fmt(stats.entries)} entries, ${fmt(stats.words)} words in all`}
                />
              </section>

              <section className="not-prose mt-section flex flex-wrap gap-group overflow-x-auto rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <DayGrid label="Wrote" days={props.wrote} todayKey={todayKey} />
                <DayGrid label="Read again" days={props.readDays} todayKey={todayKey} />
              </section>

              <p className="not-prose mt-section break-words text-sm text-gray-500">
                Entries come from diary-entries, morning-pages, the Notion weekly retros, dreams,
                essays and tiny-thoughts.md in <code>{props.dir}</code>; long ones are served in
                parts. Weekly retros show only their picked blocks, word for word; "Edit in
                Obsidian" opens the whole file. An entry you read rests for a year. Reads and skips
                are saved in <code>{DIARY_LOG_FILE}</code>. "Wrote" counts dated entries by their
                file name.
              </p>
            </>
          )}
        </article>
      </PageMain>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ req }) => {
  // First and literal: the production build inlines NODE_ENV, so everything
  // below is dead code there and the deployed route is a plain 404.
  if (process.env.NODE_ENV !== "development") return { notFound: true };
  if (!servesPrivateNotes(process.env, clientAddresses(req))) return { notFound: true };

  const dir = textsDir();
  const todayKey = dayKey(new Date());
  const entries = readEntries(dir);
  const log = readLog();
  const byId = new Map(entries.map((e) => [e.id, e]));
  const { written, read } = wordsByDay(entries, log);
  const daily = (byDay: Record<string, number>) =>
    Object.entries(byDay).map(([day, words]) => ({ day, words }));
  const start = new Date(Date.parse(`${todayKey}T12:00:00Z`) - (WEEKS * 7 - 1) * 86_400_000)
    .toISOString()
    .slice(0, 10);

  return {
    props: {
      todayKey,
      dir,
      entries: entries.length,
      morning: readMorningPage(dir, todayKey),
      pick: todaysPick(dailyOrder(entries, log, todayKey), log, todayKey),
      read: readToday(log, todayKey).map((e) => ({
        id: e.id,
        title: byId.get(e.id)?.title ?? e.id,
        words: e.words,
      })),
      stats: diaryStats(entries, log, todayKey),
      wrote: calendar(daily(written), todayKey, start, todayKey),
      readDays: calendar(daily(read), todayKey, start, todayKey),
    },
  };
};
