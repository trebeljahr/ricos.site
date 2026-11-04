import { useCallback, useState } from "react";
import {
  type ChapterMeta,
  type ChapterProgress,
  DAILY_GOAL,
  NEXT_DEADLINE,
  type PartPace,
  progressColor,
  STEPS,
  type Step,
  stepDone,
  type Tally,
  tallyByKind,
} from "src/lib/computerSeries";
import {
  Bar,
  DayGrid,
  dayCount,
  fmt,
  longDate,
  Problem,
  percent,
  Stat,
  Warning,
} from "./DeskParts";
import { type DeskIO, loadWriting, type WritingData } from "./deskStore";
import { useLoaded } from "./useLoaded";

// The Writing tab: /dev/writing's next step, deadline gauge, stats, day grid and
// chapter rows. The study lists stay on the dev page for now.

const STEP_NAME: Record<Step, string> = { drafted: "Draft", polished: "Polish", live: "Live" };
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

type KindTally = Record<ChapterMeta["kind"], Tally>;
const leading = (tally: KindTally) => (tally.chapter.count > 0 ? tally.chapter : tally.aside);

function splitPercent({ chapter, aside }: KindTally) {
  const of = (tally: Tally) => `${percent(tally.credited, tally.target)}%`;
  if (aside.count === 0) return of(chapter);
  if (chapter.count === 0) return `asides ${of(aside)}`;
  return `chapters ${of(chapter)} · asides ${of(aside)}`;
}

/** A half-circle gauge of the deadline's steps, ticked where a straight line says they should be. */
function DeadlineCard({
  pace,
  chapters,
  partName,
}: {
  pace: PartPace;
  chapters: ChapterProgress[];
  partName: string;
}) {
  const { stepsDone, stepsTotal, expected } = pace;
  const shown = stepsTotal ? stepsDone / stepsTotal : 0;
  const arc = Math.PI * 80;
  const angle = Math.PI * (stepsTotal ? Math.min(expected / stepsTotal, 1) : 0);
  const onArc = (r: number) => ({
    x: (100 - r * Math.cos(angle)).toFixed(2),
    y: (100 - r * Math.sin(angle)).toFixed(2),
  });
  const lead = Math.trunc(pace.lead);
  return (
    <div className="desk-card desk-deadline">
      <p className="desk-label">Next deadline · {dayCount(pace.daysLeft)} left</p>
      <p className="desk-card-title">
        {partName}, polished and live by {longDate(NEXT_DEADLINE.date)}
      </p>
      <svg
        viewBox="0 0 200 112"
        className="desk-gauge"
        role="img"
        aria-label={`${stepsDone} of ${stepsTotal} steps done, ${Math.floor(expected)} expected by now`}
      >
        <path d="M 20 100 A 80 80 0 0 1 180 100" className="desk-gauge-track" />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          className="desk-gauge-fill"
          stroke={progressColor(shown)}
          strokeDasharray={`${arc * shown} ${arc}`}
        />
        <line
          x1={onArc(66).x}
          y1={onArc(66).y}
          x2={onArc(94).x}
          y2={onArc(94).y}
          className="desk-gauge-tick"
        />
        <text x="100" y="88" textAnchor="middle" className="desk-gauge-text">
          {percent(stepsDone, stepsTotal)}%
        </text>
      </svg>
      <p className="desk-muted desk-center">
        {stepsDone} of {stepsTotal} steps ·{" "}
        {lead === 0 ? "on the line" : lead > 0 ? `${lead} ahead` : `${-lead} behind`}
      </p>
      <p className="desk-muted desk-center">
        {pace.neededPerWeek} steps a week · {fmt(pace.wordsLeft)} words short
      </p>
      <ul className="desk-steps-table">
        <li className="is-head">
          <span>Chapter</span>
          {STEPS.map((step) => (
            <span key={step}>{STEP_NAME[step]}</span>
          ))}
        </li>
        {chapters.map((chapter) => (
          <li key={chapter.path}>
            <span className="desk-truncate">
              <code>{chapter.number}</code> {chapter.title}
            </span>
            {STEPS.map((step) => {
              const done = stepDone(chapter, step);
              return (
                <span
                  key={step}
                  role="img"
                  aria-label={`${STEP_NAME[step]}: ${done ? "done" : "open"}`}
                  className={done ? "is-done" : "is-open"}
                >
                  {done ? "✓" : "○"}
                </span>
              );
            })}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The whole series in writing order: a segment per part, then the asides. */
function SeriesTrack({ chapters }: { chapters: ChapterProgress[] }) {
  const tally = tallyByKind(chapters);
  const credited = chapters.reduce((sum, c) => sum + c.credited, 0);
  const target = chapters.reduce((sum, c) => sum + c.target, 0);
  const parts = [...new Set(chapters.map((c) => c.part))];
  const segments = parts.flatMap((part) => {
    const inPart = chapters.filter((c) => c.part === part);
    const own = tallyByKind(inPart).chapter;
    return own.count > 0
      ? [{ key: `part-${part}`, name: `${part}. ${inPart[0].partTitle}`, tally: own }]
      : [];
  });
  if (tally.aside.count > 0) {
    segments.push({ key: "asides", name: "Asides", tally: tally.aside });
  }
  return (
    <div className="desk-card">
      <div className="desk-grid-head">
        <p className="desk-label">Whole series</p>
        <p className="desk-muted">
          {splitPercent(tally)} · {fmt(credited)} of {fmt(target)} words
        </p>
      </div>
      <div className="desk-track">
        {segments.map((s) => (
          <div
            key={s.key}
            style={{ flex: `${s.tally.target} 1 0` }}
            title={`${s.name} · ${percent(s.tally.credited, s.tally.target)}%`}
          >
            <Bar value={s.tally.credited} max={s.tally.target} thick />
          </div>
        ))}
      </div>
      <ul className="desk-track-legend">
        {segments.map((s) => (
          <li key={s.key}>
            <i
              style={{
                backgroundColor: progressColor(
                  s.tally.target ? s.tally.credited / s.tally.target : 0,
                ),
              }}
            />
            {s.name} · {percent(s.tally.credited, s.tally.target)}%
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChapterRow({
  chapter,
  openNote,
}: {
  chapter: ChapterProgress;
  openNote: (rel: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <li className={`desk-chapter${chapter.parent ? " is-aside" : ""}`}>
      <button
        type="button"
        className="desk-chapter-row"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={`desk-caret${open ? " is-open" : ""}`} aria-hidden="true">
          ▸
        </span>
        <code>{chapter.number}</code>
        <span className="desk-chapter-main">
          <span className="desk-chapter-title">
            {chapter.kind === "aside" && <span className="desk-muted">Aside: </span>}
            {chapter.title}
          </span>
          <Bar value={chapter.credited} max={chapter.target} />
        </span>
        <span className="desk-chapter-words">
          {fmt(chapter.words)} / {fmt(chapter.target)}
          <small>{chapter.status}</small>
        </span>
      </button>
      {open && (
        <div className="desk-chapter-detail">
          <button type="button" onClick={() => openNote(chapter.path)}>
            Open chapter
          </button>
          <ul>
            {chapter.sections.map((section, i) => (
              <li
                // biome-ignore lint/suspicious/noArrayIndexKey: the outline repeats headings; order is fixed
                key={`${i}-${section.heading}`}
                style={{ paddingLeft: `${(section.depth - 1) * 0.75}rem` }}
              >
                <span className="desk-truncate">
                  {section.box && <span className="desk-muted">Box: </span>}
                  {section.heading}
                </span>
                <Bar value={section.words} max={section.target} />
                <span className="desk-section-words">
                  {fmt(section.words)} / {fmt(section.target)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

export function WritingTab({
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
  const { next, pace, partName, chapters } = data;
  const scope = chapters.filter((c) => c.part === NEXT_DEADLINE.part && c.kind === "chapter");
  const parts = [...new Set(chapters.map((c) => c.part))];
  const written = data.days.filter((d) => (d.words ?? 0) > 0).length;
  const atGoal = data.days.filter((d) => (d.words ?? 0) >= DAILY_GOAL).length;
  return (
    <>
      <header className="desk-page-head">
        <h1>How computers work</h1>
        <p className="desk-muted">Writing progress</p>
      </header>
      <Warning warning={data.warning} />
      <section className="desk-columns">
        <div className="desk-stack">
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
                  Open in editor
                </button>
              </div>
            </div>
          ) : (
            <div className="desk-card is-primary">
              <p className="desk-title">{partName} is live.</p>
              <p className="desk-muted">Set the next deadline in src/lib/computerSeries.ts.</p>
            </div>
          )}
          <section className="desk-stats">
            <Stat label="Today" value={fmt(data.today)} note={`of ${fmt(DAILY_GOAL)} words`}>
              <Bar value={Math.max(data.today, 0)} max={DAILY_GOAL} />
            </Stat>
            <Stat
              label="Streak"
              value={dayCount(data.streak)}
              note={`best ${dayCount(data.best)}`}
            />
          </section>
          <section className="desk-card">
            <DayGrid
              label="Days"
              summary={`${dayCount(written)} written · ${atGoal} at goal`}
              days={data.days}
              todayKey={data.todayKey}
              deadline={NEXT_DEADLINE.date}
            />
          </section>
        </div>
        <DeadlineCard pace={pace} chapters={scope} partName={partName} />
      </section>
      <SeriesTrack chapters={chapters} />
      {parts.map((part) => {
        const inPart = chapters.filter((c) => c.part === part);
        const tally = tallyByKind(inPart);
        return (
          <section key={part}>
            <div className="desk-part-head">
              <h2 className="desk-heading">
                Part {part}: {inPart[0].partTitle}
              </h2>
              <span className="desk-muted">{splitPercent(tally)}</span>
            </div>
            <Bar value={leading(tally).credited} max={leading(tally).target} thick />
            <ul className="desk-chapters">
              {inPart.map((chapter) => (
                <ChapterRow key={chapter.path} chapter={chapter} openNote={openNote} />
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}
