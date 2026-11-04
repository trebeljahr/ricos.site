import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type CalendarDay,
  DAILY_GOAL,
  NEXT_DEADLINE,
  progressColor,
  STEPS,
  type Step,
  stepDone,
} from "src/lib/computerSeries";
import { addEvent, type DiaryEntry, type DiaryLog, KIND_LABEL, undoToday } from "src/lib/diary";
import {
  addMark,
  EMPTY_BOOK,
  fileMark,
  type Mark,
  type MarkBook,
  moveMark,
  removeMark,
  unfileMark,
} from "src/lib/diaryMarks";
import { type NotesIndex, type Passage, related, search, termPattern } from "src/lib/notesSearch";
import { DeskMarkable } from "./DeskMarkable";
import {
  buildNotesIndex,
  type DeskIO,
  type DiaryData,
  LOG_REL,
  loadDiary,
  loadWriting,
  MARKS_REL,
  readBook,
  readWholeText,
  type StreakWarning,
  updateJson,
  type WholeText,
  type WritingData,
  writeDraft,
} from "./deskStore";

type Tab = "writing" | "diary" | "desk";
type Reading = { rel: string; jump?: string };
const TAB_KEY = "desk-tab";
const TABS: { id: Tab; label: string }[] = [
  { id: "writing", label: "Writing" },
  { id: "diary", label: "Diary" },
  { id: "desk", label: "Search and piles" },
];

const fmt = (n: number) => n.toLocaleString("en-US");
const dayCount = (n: number) => `${fmt(n)} ${n === 1 ? "day" : "days"}`;
const percent = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);
const minutes = (words: number) => Math.max(1, Math.round(words / 230));
const longDate = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

function readTab(): Tab {
  try {
    const saved = window.localStorage.getItem(TAB_KEY);
    return TABS.some((t) => t.id === saved) ? (saved as Tab) : "writing";
  } catch {
    return "writing";
  }
}

/** Loads with `load`, again whenever `version` changes; keeps old data on screen meanwhile. */
function useLoaded<T>(load: () => Promise<T>, version: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: version is the reload signal
  useEffect(() => {
    let stale = false;
    load()
      .then((value) => {
        if (stale) return;
        setData(value);
        setError(null);
      })
      .catch((failure) => {
        console.error("Desk could not load:", failure);
        if (!stale) setError(String(failure));
      });
    return () => {
      stale = true;
    };
  }, [load, version]);
  return { data, error };
}

function Problem({ text }: { text: string }) {
  return <p className="desk-warning is-urgent">Could not load or save: {text}</p>;
}

function Warning({ warning }: { warning: StreakWarning | null }) {
  if (!warning) return null;
  return <p className={`desk-warning${warning.urgent ? " is-urgent" : ""}`}>{warning.text}</p>;
}

function Bar({ value, max }: { value: number; max: number }) {
  const fraction = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <div className="desk-bar">
      <div style={{ width: `${fraction * 100}%`, backgroundColor: progressColor(fraction) }} />
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="desk-card">
      <p className="desk-label">{label}</p>
      <p className="desk-big">{value}</p>
      <p className="desk-muted">{note}</p>
    </div>
  );
}

function DayGrid({
  label,
  days,
  todayKey,
  deadline,
}: {
  label: string;
  days: CalendarDay[];
  todayKey: string;
  deadline?: string;
}) {
  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  const color = (d: CalendarDay) =>
    d.words && d.words > 0
      ? progressColor(Math.min(d.words / DAILY_GOAL, 1) * 0.75 + 0.25)
      : undefined;
  return (
    <div className="desk-grid-block">
      <p className="desk-label">{label}</p>
      <div className="desk-grid-scroll">
        <div className="desk-grid">
          {weeks.map((week) => (
            <div key={week[0].day} className="desk-week">
              {week.map((d) => (
                <div
                  key={d.day}
                  title={
                    d.inRange
                      ? `${d.day}: ${d.words === null ? "to come" : `${fmt(d.words)} words`}`
                      : d.day
                  }
                  className={[
                    "desk-day",
                    !d.inRange && "is-outside",
                    d.future && "is-future",
                    d.day === todayKey && "is-today",
                    d.day === deadline && "is-deadline",
                  ]
                    .filter(Boolean)
                    .join(" ")}
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

const NEXT_LABEL: Record<Step, string> = {
  drafted: "Write next",
  polished: "Polish next",
  live: "Put live next",
};
const STEP_HINT: Record<Step, string> = {
  drafted:
    "Every section has reached its target. Set status: draft-done when it reads as finished.",
  polished: "A polish pass, its demos on a phone, test readers. Then set status: done.",
  live: "Set published: true and deploy.",
};

function WritingTab({
  io,
  version,
  openNote,
}: {
  io: DeskIO;
  version: number;
  openNote: (rel: string) => void;
}) {
  const load = useCallback(() => loadWriting(io), [io]);
  const { data, error } = useLoaded<WritingData>(load, version);
  if (error && !data) return <Problem text={error} />;
  if (!data) return <p className="desk-muted">Counting words…</p>;
  const { next, pace, partName } = data;
  const lead = Math.trunc(pace.lead);
  const parts = [...new Set(data.chapters.map((c) => c.part))];
  return (
    <>
      <Warning warning={data.warning} />
      <section className="desk-columns">
        {next ? (
          <div className="desk-card is-primary">
            <p className="desk-label">{NEXT_LABEL[next.step]}</p>
            <p className="desk-muted">
              {next.chapter.number} · {next.chapter.title}
            </p>
            {next.section ? (
              <>
                <p className="desk-title">{next.section.heading}</p>
                <p className="desk-muted">
                  {fmt(next.section.words)} of {fmt(next.section.target)} words in this section
                </p>
                <Bar value={next.section.words} max={next.section.target} />
              </>
            ) : (
              <p className="desk-hint">{STEP_HINT[next.step]}</p>
            )}
            <div className="desk-actions">
              <button
                type="button"
                className="mod-cta"
                onClick={() =>
                  openNote(
                    next.section && next.section.depth > 1
                      ? `${next.chapter.path}#${next.section.heading}`
                      : next.chapter.path,
                  )
                }
              >
                Open
              </button>
            </div>
          </div>
        ) : (
          <div className="desk-card is-primary">
            <p className="desk-title">{partName} is live.</p>
            <p className="desk-muted">Set the next deadline in src/lib/computerSeries.ts.</p>
          </div>
        )}
        <div className="desk-card">
          <p className="desk-label">
            {partName} by {longDate(NEXT_DEADLINE.date)}
          </p>
          <p className="desk-big">
            {pace.stepsDone} / {pace.stepsTotal}
          </p>
          <p className="desk-muted">
            steps done ·{" "}
            {lead === 0 ? "on the line" : lead > 0 ? `${lead} ahead` : `${-lead} behind`}
          </p>
          <Bar value={pace.stepsDone} max={pace.stepsTotal} />
          <p className="desk-muted desk-gap">
            {pace.daysLeft} days left · {pace.neededPerWeek} steps a week · {fmt(pace.wordsLeft)}{" "}
            words short
          </p>
        </div>
      </section>
      <section className="desk-stats">
        <Stat label="Today" value={fmt(data.today)} note={`goal ${fmt(DAILY_GOAL)}`} />
        <Stat label="Streak" value={dayCount(data.streak)} note={`best ${data.best}`} />
      </section>
      <section className="desk-card">
        <DayGrid
          label="Words per day"
          days={data.days}
          todayKey={data.todayKey}
          deadline={NEXT_DEADLINE.date}
        />
      </section>
      {parts.map((part) => {
        const inPart = data.chapters.filter((c) => c.part === part);
        return (
          <section key={part}>
            <h2 className="desk-heading">
              Part {part}: {inPart[0].partTitle}
            </h2>
            <ul className="desk-rows">
              {inPart.map((chapter) => (
                <li key={chapter.path}>
                  <button
                    type="button"
                    className="desk-row clickable-icon"
                    onClick={() => openNote(chapter.path)}
                  >
                    <span className="desk-row-title">
                      {chapter.number} {chapter.title}
                    </span>
                    <span className="desk-steps">
                      {STEPS.map((step) => (
                        <span
                          key={step}
                          title={step}
                          className={`desk-step${stepDone(chapter, step) ? " is-done" : ""}`}
                        />
                      ))}
                    </span>
                    <span className="desk-muted desk-row-words">
                      {fmt(chapter.credited)} / {fmt(chapter.target)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}

function MarksHere({ marks, onRemove }: { marks: Mark[]; onRemove: (id: string) => void }) {
  if (marks.length === 0) return null;
  return (
    <div className="desk-gap">
      <p className="desk-label">Marked here</p>
      <ul className="desk-marks-here">
        {marks.map((mark) => (
          <li key={mark.id}>
            <span>{mark.quote}</span>
            <button type="button" className="desk-link" onClick={() => onRemove(mark.id)}>
              remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The mark book as state, with every change applied to the file as it is on disk now. */
function useBook(io: DeskIO, version: number) {
  const load = useCallback(() => readBook(io), [io]);
  const { data, error } = useLoaded<MarkBook>(load, version);
  const [book, setBook] = useState<MarkBook>(EMPTY_BOOK);
  const [failure, setFailure] = useState<string | null>(null);
  useEffect(() => {
    if (data) setBook(data);
  }, [data]);
  const change = useCallback(
    (update: (current: MarkBook) => MarkBook) => {
      updateJson(io, MARKS_REL, EMPTY_BOOK, update)
        .then((next) => {
          setBook(next);
          setFailure(null);
        })
        .catch((problem) => {
          console.error("Desk could not save the mark:", problem);
          setFailure(String(problem));
        });
    },
    [io],
  );
  return { book, change, problem: failure ?? error };
}

const today = () => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

function Reader({
  data,
  book,
  changeBook,
  busy,
  onRead,
  onSkip,
  openNote,
  onWhole,
}: {
  data: NonNullable<DiaryData["pick"]>;
  book: MarkBook;
  changeBook: (update: (current: MarkBook) => MarkBook) => void;
  busy: boolean;
  onRead: () => void;
  onSkip: () => void;
  openNote: (rel: string) => void;
  onWhole: (rel: string) => void;
}) {
  const { entry, reason }: { entry: DiaryEntry; reason: string } = data;
  const rel = `texts/${entry.rel}`;
  const marks = book.marks.filter((m) => m.rel === rel);
  const meta = [
    KIND_LABEL[entry.kind],
    entry.date ? longDate(entry.date) : null,
    entry.part ? `part ${entry.part.index} of ${entry.part.count}` : null,
    entry.fullWords && entry.fullWords > entry.words
      ? `${fmt(entry.words)} of ${fmt(entry.fullWords)} words · ${minutes(entry.words)} min`
      : `${fmt(entry.words)} words · ${minutes(entry.words)} min`,
  ].filter(Boolean);
  return (
    <section className="desk-reader">
      <p className="desk-reason">{reason}</p>
      <h2 className="desk-entry-title">{entry.title}</h2>
      <p className="desk-muted">{meta.join(" · ")}</p>
      <div className="desk-quote-body">
        <DeskMarkable
          markdown={entry.body}
          quotes={marks.map((m) => m.quote)}
          onMark={(quote) =>
            changeBook((current) =>
              addMark(current, {
                quote,
                rel,
                title: entry.title,
                date: entry.date,
                day: today(),
              }),
            )
          }
        />
      </div>
      <MarksHere marks={marks} onRemove={(id) => changeBook((c) => removeMark(c, id))} />
      <div className="desk-actions desk-gap">
        <button type="button" className="mod-cta" disabled={busy} onClick={onRead}>
          Mark as read
        </button>
        <button type="button" onClick={() => openNote(entry.path)}>
          Edit
        </button>
        {(entry.part || entry.fullWords) && (
          <button type="button" onClick={() => onWhole(rel)}>
            {entry.part ? "Whole text" : "Whole retro"}
          </button>
        )}
        <button type="button" disabled={busy} onClick={onSkip}>
          Something else
        </button>
      </div>
    </section>
  );
}

function DiaryTab({
  io,
  version,
  openNote,
  onWhole,
}: {
  io: DeskIO;
  version: number;
  openNote: (rel: string) => void;
  onWhole: (rel: string) => void;
}) {
  const [saved, setSaved] = useState(0);
  const load = useCallback(() => loadDiary(io), [io]);
  const { data, error } = useLoaded<DiaryData>(load, version + saved);
  const { book, change, problem } = useBook(io, version);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  if (error && !data) return <Problem text={error} />;
  if (!data) return <p className="desk-muted">Finding today's entry…</p>;

  const send = async (id: string, action: "read" | "skip" | "undo", words = 0) => {
    setBusy(true);
    try {
      await updateJson<DiaryLog>(io, LOG_REL, { events: [] }, (log) => {
        const without = undoToday(log, id, data.todayKey);
        return action === "undo"
          ? without
          : addEvent(without, { day: data.todayKey, id, action, words });
      });
      if (action === "read") setMore(false);
      setFailure(null);
      setSaved((n) => n + 1);
    } catch (problemSaving) {
      console.error("Desk could not save to the diary log:", problemSaving);
      setFailure(String(problemSaving));
    } finally {
      setBusy(false);
    }
  };

  const startMorning = async () => {
    try {
      await io.createNote(data.morning.rel, "");
      openNote(data.morning.rel);
    } catch (problemCreating) {
      console.error("Desk could not create the morning page:", problemCreating);
      setFailure(String(problemCreating));
    }
  };

  const { morning, pick, read, stats } = data;
  const written = morning.words !== null && morning.words > 0;
  const showing = read.length === 0 || more;
  const readWords = read.reduce((sum, r) => sum + r.words, 0);
  const shownProblem = failure ?? problem;
  return (
    <>
      <Warning warning={data.warning} />
      {shownProblem && <Problem text={shownProblem} />}
      <section className="desk-columns is-even">
        <div className="desk-card">
          <p className="desk-label">1 · Write</p>
          <p className="desk-title">
            {written
              ? `Morning page: ${fmt(morning.words ?? 0)} words`
              : "No morning page yet today"}
          </p>
          <p className="desk-muted">{longDate(data.todayKey)}</p>
          <div className="desk-actions">
            <button type="button" className={written ? "" : "mod-cta"} onClick={startMorning}>
              {morning.words === null ? "Start it" : "Open it"}
            </button>
          </div>
        </div>
        <div className="desk-card">
          <p className="desk-label">2 · Read</p>
          {read.length === 0 ? (
            <p className="desk-title">One entry from your past self, below</p>
          ) : (
            <>
              <p className="desk-title">Read today: {fmt(readWords)} words</p>
              <ul className="desk-marks-here">
                {read.map((r) => (
                  <li key={r.id}>
                    <span>
                      {r.title} · {fmt(r.words)} words
                    </span>
                    <button
                      type="button"
                      className="desk-link"
                      disabled={busy}
                      onClick={() => send(r.id, "undo")}
                    >
                      undo
                    </button>
                  </li>
                ))}
              </ul>
              {!showing && (
                <div className="desk-actions">
                  <button type="button" onClick={() => setMore(true)}>
                    Read one more
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
      {showing &&
        (pick ? (
          <Reader
            data={pick}
            book={book}
            changeBook={change}
            busy={busy}
            onRead={() => send(pick.entry.id, "read", pick.entry.words)}
            onSkip={() => send(pick.entry.id, "skip", pick.entry.words)}
            openNote={openNote}
            onWhole={onWhole}
          />
        ) : (
          <p>Nothing left to read today.</p>
        ))}
      <section className="desk-stats">
        <Stat label="Read streak" value={dayCount(data.readStreak)} note="in a row" />
        <Stat
          label="Written"
          value={fmt(stats.written)}
          note={`words in 30 days, on ${dayCount(stats.daysWritten)}`}
        />
        <Stat
          label="Read again"
          value={fmt(stats.read)}
          note={`words in 30 days, on ${dayCount(stats.daysRead)}`}
        />
        <Stat
          label="Archive met"
          value={`${percent(stats.wordsMet, stats.words)}%`}
          note={`${fmt(stats.entriesMet)} of ${fmt(stats.entries)} entries`}
        />
      </section>
      <section className="desk-card desk-two-grids">
        <DayGrid label="Wrote" days={data.wrote} todayKey={data.todayKey} />
        <DayGrid label="Read again" days={data.readDays} todayKey={data.todayKey} />
      </section>
    </>
  );
}

const metaOf = (p: { title: string; date: string | null; heading?: string }) =>
  [p.date, p.title === p.date ? null : p.title, p.heading?.replace(/^#+\s*|\*\*/g, "")]
    .filter(Boolean)
    .join(" · ");

function PassageRow({
  passage,
  book,
  terms,
  onMark,
  onWhole,
}: {
  passage: Passage;
  book: MarkBook;
  terms?: RegExp | null;
  onMark: (passage: Passage, quote: string) => void;
  onWhole: (rel: string) => void;
}) {
  return (
    <li className="desk-passage">
      <p className="desk-muted">
        <strong>{passage.source}</strong> · {metaOf(passage)}
      </p>
      <DeskMarkable
        markdown={passage.text}
        quotes={book.marks.filter((m) => m.rel === passage.rel).map((m) => m.quote)}
        terms={terms}
        onMark={(quote) => onMark(passage, quote)}
      />
      <div className="desk-actions is-small">
        <button type="button" onClick={() => onMark(passage, passage.text)}>
          Mark all of this
        </button>
        <button type="button" onClick={() => onWhole(passage.rel)}>
          Read in context
        </button>
      </div>
    </li>
  );
}

function MarkRow({
  mark,
  book,
  change,
  index,
  onMarkPassage,
  onWhole,
  pile,
}: {
  mark: Mark;
  book: MarkBook;
  change: (update: (current: MarkBook) => MarkBook) => void;
  index: () => Promise<NotesIndex>;
  onMarkPassage: (passage: Passage, quote: string) => void;
  onWhole: (rel: string, jump?: string) => void;
  pile?: string;
}) {
  const [toPile, setToPile] = useState("");
  const [links, setLinks] = useState<Passage[] | null>(null);
  const others = book.piles.filter((p) => p.ids.includes(mark.id) && p.name !== pile);
  return (
    <li className="desk-passage">
      <blockquote className="desk-mark-quote">{mark.quote}</blockquote>
      <p className="desk-muted">
        <button type="button" className="desk-link" onClick={() => onWhole(mark.rel, mark.quote)}>
          {metaOf(mark)}
        </button>
        {others.map((p) => (
          <span key={p.name} className="desk-chip">
            {p.name}
          </span>
        ))}
      </p>
      <form
        className="desk-actions is-small"
        onSubmit={(event) => {
          event.preventDefault();
          if (!toPile.trim()) return;
          change((current) => fileMark(current, mark.id, toPile));
          setToPile("");
        }}
      >
        <input
          value={toPile}
          onChange={(event) => setToPile(event.target.value)}
          list="desk-piles"
          placeholder="Add to pile…"
          aria-label="Add to pile"
        />
        {pile && (
          <>
            <button type="button" onClick={() => change((c) => moveMark(c, mark.id, pile, -1))}>
              ↑
            </button>
            <button type="button" onClick={() => change((c) => moveMark(c, mark.id, pile, 1))}>
              ↓
            </button>
            <button type="button" onClick={() => change((c) => unfileMark(c, mark.id, pile))}>
              Out of this pile
            </button>
          </>
        )}
        <button
          type="button"
          onClick={async () =>
            setLinks(links ? null : related(await index(), mark.quote, mark.rel))
          }
        >
          {links ? "Hide related" : "Related"}
        </button>
        <button type="button" onClick={() => change((c) => removeMark(c, mark.id))}>
          Remove mark
        </button>
      </form>
      {links && (
        <div className="desk-related">
          {links.length === 0 && <p className="desk-muted">Nothing close found.</p>}
          <ul className="desk-passages">
            {links.map((passage, i) => (
              <PassageRow
                // biome-ignore lint/suspicious/noArrayIndexKey: a stable result list for one mark
                key={`${passage.rel}-${i}`}
                passage={passage}
                book={book}
                onMark={onMarkPassage}
                onWhole={onWhole}
              />
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

function DeskTab({
  io,
  version,
  openNote,
  onWhole,
}: {
  io: DeskIO;
  version: number;
  openNote: (rel: string) => void;
  onWhole: (rel: string, jump?: string) => void;
}) {
  const { book, change, problem } = useBook(io, version);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("");
  const [sort, setSort] = useState<"rank" | "date">("rank");
  const [index, setIndex] = useState<NotesIndex | null>(null);
  const [indexing, setIndexing] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null);

  // A note changed: build again on the next search, not on every keystroke in the editor.
  // biome-ignore lint/correctness/useExhaustiveDependencies: version is the reset signal
  useEffect(() => {
    setIndex(null);
  }, [version]);

  const ensureIndex = useCallback(async () => {
    if (index) return index;
    setIndexing(true);
    try {
      const built = await buildNotesIndex(io);
      setIndex(built);
      return built;
    } finally {
      setIndexing(false);
    }
  }, [io, index]);

  useEffect(() => {
    if (query.trim().length >= 2 && !index && !indexing) {
      ensureIndex().catch((problemIndexing) => {
        console.error("Desk could not build the search index:", problemIndexing);
        setFailure(String(problemIndexing));
      });
    }
  }, [query, index, indexing, ensureIndex]);

  const results = useMemo(
    () =>
      index && query.trim().length >= 2
        ? search(index, query, { source: source || undefined, sort })
        : null,
    [index, query, source, sort],
  );
  const terms = useMemo(() => termPattern(query), [query]);
  const sources = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of index?.passages ?? []) counts.set(p.source, (counts.get(p.source) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1]);
  }, [index]);

  const markPassage = (passage: Passage, quote: string) =>
    change((current) =>
      addMark(current, {
        quote: quote.trim(),
        rel: passage.rel,
        title: passage.title,
        date: passage.date,
        day: today(),
      }),
    );

  const writeOut = async (pile: string) => {
    try {
      setDraft(await writeDraft(io, book, pile));
    } catch (problemWriting) {
      console.error("Desk could not write the draft:", problemWriting);
      setFailure(String(problemWriting));
    }
  };

  const filed = new Set(book.piles.flatMap((p) => p.ids));
  const loose = book.marks.filter((m) => !filed.has(m.id)).reverse();
  const byId = new Map(book.marks.map((m) => [m.id, m]));
  const rowProps = { book, change, index: ensureIndex, onMarkPassage: markPassage, onWhole };
  const shownProblem = failure ?? problem;

  return (
    <>
      {shownProblem && <Problem text={shownProblem} />}
      <datalist id="desk-piles">
        {book.piles.map((p) => (
          <option key={p.name} value={p.name} />
        ))}
      </datalist>
      <section>
        <input
          type="search"
          className="desk-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={'Search everything. "Exact words" in quotes.'}
          aria-label="Search your notes"
        />
        <div className="desk-actions is-small">
          <select
            className="dropdown"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            aria-label="Only this source"
          >
            <option value="">Everything</option>
            {sources.map(([name, count]) => (
              <option key={name} value={name}>
                {name} ({fmt(count)})
              </option>
            ))}
          </select>
          <button type="button" onClick={() => setSort(sort === "rank" ? "date" : "rank")}>
            {sort === "rank" ? "Best matches first" : "Oldest first"}
          </button>
          {indexing && <span className="desk-muted">Reading your notes…</span>}
          {results && (
            <span className="desk-muted">
              {fmt(results.passages.length)} of {fmt(results.total)} passages · words only
            </span>
          )}
        </div>
      </section>
      {results && (
        <ul className="desk-passages">
          {results.passages.map((passage, i) => (
            <PassageRow
              // biome-ignore lint/suspicious/noArrayIndexKey: passages can repeat their text
              key={`${passage.rel}-${i}`}
              passage={passage}
              book={book}
              terms={terms}
              onMark={markPassage}
              onWhole={onWhole}
            />
          ))}
        </ul>
      )}
      {draft && (
        <p>
          Draft written:{" "}
          <button type="button" className="desk-link" onClick={() => openNote(draft)}>
            {draft}
          </button>
        </p>
      )}
      {book.piles.map((pile) => (
        <section key={pile.name}>
          <div className="desk-pile-head">
            <h2 className="desk-heading">{pile.name}</h2>
            <button type="button" onClick={() => writeOut(pile.name)}>
              Write out as a draft
            </button>
          </div>
          <ul className="desk-passages">
            {pile.ids.flatMap((id) => {
              const mark = byId.get(id);
              return mark ? <MarkRow key={id} mark={mark} pile={pile.name} {...rowProps} /> : [];
            })}
          </ul>
        </section>
      ))}
      <section>
        <h2 className="desk-heading">Not in a pile yet ({loose.length})</h2>
        {book.marks.length === 0 ? (
          <p className="desk-muted">
            Select text in today's reading, or in a search result, and press Mark.
          </p>
        ) : (
          <ul className="desk-passages">
            {loose.map((mark) => (
              <MarkRow key={mark.id} mark={mark} {...rowProps} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function WholeTextView({
  io,
  version,
  reading,
  onBack,
  openNote,
}: {
  io: DeskIO;
  version: number;
  reading: Reading;
  onBack: () => void;
  openNote: (rel: string) => void;
}) {
  const load = useCallback(() => readWholeText(io, reading.rel), [io, reading.rel]);
  const { data, error } = useLoaded<WholeText>(load, version);
  const { book, change, problem } = useBook(io, version);
  const back = (
    <button type="button" onClick={onBack}>
      ← Back
    </button>
  );
  if (error && !data) {
    return (
      <>
        {back}
        <Problem text={error} />
      </>
    );
  }
  if (!data) return back;
  const marks = book.marks.filter((m) => m.rel === data.rel);
  return (
    <section className="desk-reader">
      <div className="desk-actions">
        {back}
        <button type="button" onClick={() => openNote(data.rel)}>
          Edit
        </button>
      </div>
      {problem && <Problem text={problem} />}
      <h2 className="desk-entry-title">{data.title}</h2>
      <p className="desk-muted">{data.rel}</p>
      <div className="desk-quote-body">
        <DeskMarkable
          markdown={data.body}
          quotes={marks.map((m) => m.quote)}
          scrollTo={reading.jump}
          onMark={(quote) =>
            change((current) =>
              addMark(current, {
                quote,
                rel: data.rel,
                title: data.title,
                date: data.date,
                day: today(),
              }),
            )
          }
        />
      </div>
      <MarksHere marks={marks} onRemove={(id) => change((c) => removeMark(c, id))} />
    </section>
  );
}

export function DeskApp({
  io,
  version,
  openNote,
}: {
  io: DeskIO;
  version: number;
  openNote: (rel: string) => void;
}) {
  const [tab, setTab] = useState<Tab>(readTab);
  const [reading, setReading] = useState<Reading | null>(null);

  const choose = (next: Tab) => {
    setTab(next);
    setReading(null);
    try {
      window.localStorage.setItem(TAB_KEY, next);
    } catch {
      // Only a convenience: the tab is not remembered.
    }
  };
  const onWhole = (rel: string, jump?: string) => setReading({ rel, jump });

  return (
    <div className="desk">
      <nav className="desk-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id && !reading ? "is-active" : ""}
            aria-current={tab === t.id && !reading ? "page" : undefined}
            onClick={() => choose(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      {reading ? (
        <WholeTextView
          io={io}
          version={version}
          reading={reading}
          onBack={() => setReading(null)}
          openNote={openNote}
        />
      ) : (
        <>
          {tab === "writing" && <WritingTab io={io} version={version} openNote={openNote} />}
          {tab === "diary" && (
            <DiaryTab io={io} version={version} openNote={openNote} onWhole={onWhole} />
          )}
          {tab === "desk" && (
            <DeskTab io={io} version={version} openNote={openNote} onWhole={onWhole} />
          )}
        </>
      )}
    </div>
  );
}
