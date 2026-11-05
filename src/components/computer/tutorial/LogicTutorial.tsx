import clsx from "clsx";
import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useTutorialProgress } from "../../../hooks/useTutorialProgress";
import { type Circuit, validateCircuit } from "../../../lib/computer/logic";
import { simplificationNote } from "../../../lib/computer/tutorial/analysis";
import {
  type Grade,
  gradeLevel,
  gradePassed,
  wiringKey,
} from "../../../lib/computer/tutorial/grade";
import { requestedHints } from "../../../lib/computer/tutorial/hints";
import { compactStart, levelStart } from "../../../lib/computer/tutorial/kit";
import { CATALOG, LEARNING_LEVELS, LEVELS, levelById } from "../../../lib/computer/tutorial/levels";
import { levelRows } from "../../../lib/computer/tutorial/paletteRows";
import {
  clearAssisted,
  markSkipped,
  markSolved,
  type Progress,
  progressStore,
  saveDraft,
} from "../../../lib/computer/tutorial/progress";
import type { CustomGrade, Level } from "../../../lib/computer/tutorial/types";
import { LogicBuilder, type LogicBuilderHandle } from "../LogicBuilder";
import { type Callout, HintLayer } from "./HintLayer";
import { SpecView } from "./SpecView";
import styles from "./Tutorial.module.css";
import { TutorialSuccess } from "./TutorialSuccess";
import { useTutorialSuccess } from "./useTutorialSuccess";

export type LogicTutorialProps = {
  /** The level to open first. Default: the first level of `levels`. */
  level?: string;
  /** Level ids this tutorial offers, in order. Default: the whole ladder. */
  levels?: readonly string[];
  /** A level opens only once the main levels before it are solved or skipped. */
  sequential?: boolean;
  /** Link each level to its chapter. Off where those chapters are not out yet. */
  chapterLinks?: boolean;
  /** A chapter workspace; undefined inherits the surrounding embed context. */
  embedded?: boolean;
  /** Called when the reader opens another level, e.g. to update the URL. */
  onLevelChange?: (id: string) => void;
  /** Extra content at the end of the level panel, e.g. a program runner for the CPU. */
  extra?: (context: ExtraContext) => ReactNode;
};

export type ExtraContext = {
  level: Level;
  solved: boolean;
  /** The circuit on the board right now. */
  circuit: () => Circuit;
  handle: LogicBuilderHandle | null;
};

/** Truth tables this short are graded in the same render; other levels once the edits pause. */
const LIVE_ROWS = 16;
const GRADE_DELAY = 300;
const SAVE_DELAY = 500;
const NO_RINGS: readonly string[] = [];

const isDone = (level: Level, progress: Progress) =>
  Boolean(progress.solved[level.id]) || progress.skipped.includes(level.id);

/** Opens once the main levels before it are done. A required level added later never locks a reader already past it. */
const isOpen = (levels: readonly Level[], index: number, progress: Progress) => {
  const furthest = levels.findLastIndex((level) => isDone(level, progress));
  return levels
    .slice(0, index)
    .every((level, before) => level.optional || before < furthest || isDone(level, progress));
};

function restoreDraft(level: Level, progress: Progress, start: ReturnType<typeof levelStart>) {
  const draft = progress.drafts[level.id];
  const solved = progress.solved[level.id]?.circuit;
  const saved = draft ?? solved;
  if (saved == null) return start.circuit;
  try {
    const circuit = draft != null && level.restore ? level.restore(draft) : validateCircuit(saved);
    return circuit ? start.enforce({ ...circuit, name: start.circuit.name }) : start.circuit;
  } catch {
    return start.circuit;
  }
}

const fitPhone = (start: ReturnType<typeof levelStart>) =>
  typeof window !== "undefined" && window.matchMedia?.("(max-width: 640px)")?.matches
    ? compactStart(start)
    : start;

const statusOf = (level: Level, progress: Progress) =>
  progress.solved[level.id] ? "✓" : progress.skipped.includes(level.id) ? "↷" : "";

/**
 * The grade of the board as it is, kept up to date without a button. `exact` is
 * undefined while a slow level waits for the edits to pause, so a pass is never
 * credited to a board it was not measured on; `shown` keeps the last result on
 * screen meanwhile. Flipping a switch does not change the wiring, so it does not
 * grade again.
 */
function useLiveGrade(
  circuit: Circuit,
  level: Level,
  locked: readonly string[],
  allowed: ReturnType<typeof CATALOG.allowed>,
  enabled: boolean,
): { exact?: Grade; shown?: Grade } {
  const instant =
    level.spec.kind === "truth" &&
    (level.spec.rows?.length ?? 2 ** level.spec.inputs.length) <= LIVE_ROWS;
  const immediate = useMemo(
    () => (instant ? gradeLevel(circuit, level, locked, allowed) : undefined),
    [instant, circuit, level, locked, allowed],
  );
  const key = useMemo(() => (instant ? "" : wiringKey(circuit)), [instant, circuit]);
  const latest = useRef(circuit);
  latest.current = circuit;
  const [settled, setSettled] = useState<{ level: string; key: string; grade: Grade } | null>(null);
  useEffect(() => {
    if (instant || !enabled) return;
    const timer = window.setTimeout(
      () =>
        setSettled({
          level: level.id,
          key,
          grade: gradeLevel(latest.current, level, locked, allowed),
        }),
      GRADE_DELAY,
    );
    return () => window.clearTimeout(timer);
  }, [instant, enabled, key, level, locked, allowed]);
  if (instant) return { exact: immediate, shown: immediate };
  const current = settled?.level === level.id ? settled : null;
  return { exact: current?.key === key ? current.grade : undefined, shown: current?.grade };
}

/**
 * A tutorial in one circuit builder: the level's goal and spec sit in a column
 * beside the canvas, hints point at parts in it, and solved levels become parts
 * in the palettes of later levels.
 */
export function LogicTutorial({
  level: requested,
  levels: ids,
  sequential = false,
  chapterLinks = true,
  onLevelChange,
  extra,
  embedded,
}: LogicTutorialProps) {
  const hintId = useId();
  const ladder = useMemo(
    () =>
      ids
        ? ids.map((id) => levelById(id)).filter((level): level is Level => Boolean(level))
        : LEARNING_LEVELS,
    [ids],
  );
  const [levelId, setLevelId] = useState(() => levelById(requested)?.id ?? ladder[0]?.id);
  const level = levelById(levelId) ?? ladder[0];
  const practiceVariants = level.practice
    ? LEVELS.filter((item) => item.practice?.family === level.practice?.family)
    : [];
  const index = ladder.findIndex(
    (item) =>
      item.id === level.id || (item.practice && item.practice.family === level.practice?.family),
  );
  const progress = useTutorialProgress();
  const start = useMemo(() => fitPhone(levelStart(level)), [level]);
  const allowed = useMemo(() => CATALOG.allowed(level), [level]);
  const gatePalette = useMemo(() => [...allowed.gates], [allowed]);
  const rows = useMemo(() => levelRows(CATALOG, level.palette, progress), [level, progress]);
  // The board's first circuit, read once per level opening (later saves come from the board).
  const [opened, setOpened] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-read only when a level opens or resets
  const initial = useMemo(
    () => restoreDraft(level, progressStore.get(), start),
    [level, start, opened],
  );
  const [circuit, setCircuit] = useState<Circuit>(initial);
  const circuitRef = useRef(initial);
  const handle = useRef<LogicBuilderHandle | null>(null);
  const [hints, setHints] = useState(0);
  const saveTimer = useRef<number | undefined>(undefined);
  const pendingDraft = useRef<{ level: Level; circuit: Circuit } | null>(null);
  const flushDraft = useCallback(() => {
    window.clearTimeout(saveTimer.current);
    const pending = pendingDraft.current;
    pendingDraft.current = null;
    if (pending)
      saveDraft(
        pending.level.id,
        pending.level.save ? pending.level.save(pending.circuit) : pending.circuit,
      );
  }, []);

  useEffect(() => {
    if (requested && levelById(requested)) {
      flushDraft();
      setLevelId(requested);
    }
  }, [requested, flushDraft]);

  useEffect(() => {
    circuitRef.current = initial;
    setCircuit(initial);
    setHints(0);
  }, [initial]);
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flushDraft();
    };
    window.addEventListener("pagehide", flushDraft);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", flushDraft);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      flushDraft();
    };
  }, [flushDraft]);

  const solved = Boolean(progress.solved[level.id]);
  const assisted = progress.assisted.includes(level.id);
  const open = !sequential || isOpen(ladder, index, progress);
  const { exact: live, shown } = useLiveGrade(circuit, level, start.locked, allowed, open);
  const grade = shown?.kind === "structure" ? undefined : shown;
  const session = useMemo(
    () => ({ level: level.id, opened, initial }),
    [level.id, opened, initial],
  );
  const recordLivePass = useCallback(
    (valid: Circuit) => {
      markSolved(level.id, valid);
    },
    [level],
  );
  const { celebration, noteChange, resetSuccess } = useTutorialSuccess({
    session,
    initial,
    circuit,
    liveGrade: live,
    enabled: open && !assisted,
    solved,
    recordLivePass,
  });
  const currentCorrect = Boolean(live && gradePassed(live));
  const simplification = useMemo(
    () =>
      currentCorrect && !assisted ? simplificationNote(circuit, level, start.locked) : undefined,
    [currentCorrect, assisted, circuit, level, start.locked],
  );
  const onChange = useCallback(
    (next: Circuit) => {
      if (JSON.stringify(next) === JSON.stringify(circuitRef.current)) return;
      noteChange(next);
      circuitRef.current = next;
      setCircuit(next);
      if (pendingDraft.current && pendingDraft.current.level.id !== level.id) flushDraft();
      window.clearTimeout(saveTimer.current);
      pendingDraft.current = { level, circuit: next };
      saveTimer.current = window.setTimeout(flushDraft, SAVE_DELAY);
    },
    [level, flushDraft, noteChange],
  );

  const openLevel = (id: string) => {
    flushDraft();
    setLevelId(id);
    setOpened((value) => value + 1);
    onLevelChange?.(id);
  };
  const next = ladder[index + 1];

  const skip = () => {
    markSkipped(level.id);
    if (next) openLevel(next.id);
  };
  const reset = () => {
    resetSuccess(start.circuit);
    window.clearTimeout(saveTimer.current);
    pendingDraft.current = null;
    setHints(0);
    clearAssisted(level.id);
    saveDraft(level.id, null);
    handle.current?.load(start.circuit);
  };

  const shownHints = hints ? requestedHints(level, circuit, shown, hints) : [];
  const hintLimit = (level.hints?.length ?? 0) + 1;
  const latestHint = shownHints[shownHints.length - 1];
  const callout: Callout | undefined = latestHint?.anchor
    ? { text: latestHint.text, anchor: latestHint.anchor, tone: "tip" }
    : undefined;
  const customHighlight = shown?.kind === "custom" ? shown.result.highlight : undefined;
  const customFailure = shown?.kind === "custom" && !shown.pass ? shown.result : undefined;

  const panel = (
    <div className={styles.panel}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>{level.section}</span>
        <div className={styles.titleRow}>
          <h2 className={styles.title}>{level.title}</h2>
          {solved && <span className={styles.badge}>Solved ✓</span>}
        </div>
        {ladder.length > 1 && (
          <div className={styles.picker}>
            <button
              type="button"
              disabled={index <= 0}
              onClick={() => openLevel(ladder[index - 1].id)}
              aria-label="Previous level"
            >
              ‹
            </button>
            <select
              value={ladder[index]?.id ?? level.id}
              onChange={(event) => openLevel(event.target.value)}
              aria-label="Level"
            >
              {[...new Set(ladder.map((item) => item.section))].map((section) => (
                <optgroup key={section} label={section}>
                  {ladder
                    .filter((item) => item.section === section)
                    .map((item) => (
                      <option
                        key={item.id}
                        value={item.id}
                        disabled={sequential && !isOpen(ladder, ladder.indexOf(item), progress)}
                      >
                        {ladder.indexOf(item) + 1}. {item.title} {statusOf(item, progress)}
                        {item.optional ? " (optional)" : ""}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
            <button
              type="button"
              disabled={!next}
              onClick={() => next && openLevel(next.id)}
              aria-label="Next level"
            >
              ›
            </button>
          </div>
        )}
      </header>

      {!open ? (
        <p className={styles.notice}>Solve or skip the levels before this one to open it.</p>
      ) : (
        <>
          <p className={styles.goal}>{level.goal}</p>
          {chapterLinks && level.chapter && (
            <p className={styles.chapter}>
              Read:{" "}
              <Link href={level.chapter.href}>
                {level.chapter.number} {level.chapter.title} →
              </Link>
            </p>
          )}

          {practiceVariants.length > 1 && (
            <label className={styles.parameter}>
              Challenge parameters
              <select
                aria-label={
                  level.practice?.family === "manual-counter"
                    ? "Counter challenge"
                    : "Construction parameters"
                }
                value={level.id}
                onChange={(event) => openLevel(event.target.value)}
              >
                {practiceVariants.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.practice?.label} {statusOf(item, progress)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className={styles.actions}>
            <button
              type="button"
              disabled={hints >= hintLimit}
              data-tutorial-hint=""
              title="Hints reveal one clue at a time and leave your wiring unchanged."
              aria-controls={hintId}
              aria-expanded={hints > 0}
              onClick={() => setHints((value) => value + 1)}
            >
              {hints >= hintLimit
                ? "All hints shown"
                : hints === hintLimit - 1
                  ? "Last hint"
                  : hints
                    ? "Another hint"
                    : "Hint"}
            </button>
            {hints > 0 && (
              <button type="button" onClick={() => setHints(0)}>
                Dismiss hints
              </button>
            )}
            <button
              type="button"
              onClick={reset}
              title="Start this level again from its first board"
            >
              Reset
            </button>
            {next && !solved && (
              <button type="button" onClick={skip}>
                Skip
              </button>
            )}
          </div>
          <div id={hintId} aria-live="polite">
            {shownHints.length > 0 && (
              <ul className={styles.hints} aria-label="Hints">
                {shownHints.map((hint) => (
                  <li key={hint.text}>
                    {hint.title && <strong>{hint.title}: </strong>}
                    {hint.text}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <h3 className={styles.subhead}>
            {level.spec.kind === "truth"
              ? "Truth table"
              : level.spec.kind === "sequence"
                ? "Test sequence"
                : "Tests"}
          </h3>
          <SpecView spec={level.spec} grade={grade} />

          <div aria-live="polite">
            {customFailure && (
              <CustomFailure
                result={customFailure}
                onReplay={(replay) => handle.current?.show(replay.circuit, replay.halfCycles)}
              />
            )}
            {currentCorrect && next && (
              <button
                type="button"
                className={styles.nextButton}
                onClick={() => openLevel(next.id)}
              >
                Next: {next.title} →
              </button>
            )}
          </div>
          {extra?.({ level, solved, circuit: () => circuitRef.current, handle: handle.current })}
        </>
      )}
    </div>
  );

  return (
    <LogicBuilder
      key={`${level.id}:${opened}`}
      embedded={embedded}
      storageKey={null}
      challenge={{
        circuit: initial,
        enforce: start.enforce,
        palette: gatePalette,
        rows,
        highlight: customHighlight,
        onChange,
        handleRef: handle,
        panel,
        feedback: open ? (
          <TutorialSuccess
            key={`${level.id}:${opened}`}
            correct={currentCorrect}
            message={
              simplification?.text ?? (live?.kind === "custom" ? live.result.summary : undefined)
            }
            celebration={celebration}
          />
        ) : null,
        overlay: open ? <HintLayer callout={callout} rings={NO_RINGS} /> : null,
      }}
    />
  );
}

/** A level with no table to highlight: what its own test found, kept current. */
function CustomFailure({
  result,
  onReplay,
}: {
  result: CustomGrade;
  onReplay: (replay: { circuit: Circuit; halfCycles: number }) => void;
}) {
  return (
    <div className={clsx(styles.result, styles.resultFail)}>
      <p>{result.summary}</p>
      {result.problems && (
        <ul>
          {result.problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}
      {result.table && (
        <table className={styles.compare}>
          <thead>
            <tr>
              {result.table.head.map((cell) => (
                <th key={cell}>{cell}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.table.rows.map((row) => (
              <tr key={row.join("|")}>
                {row.map((cell, index) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: cells of a fixed row
                  <td key={index}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {result.replay && (
        <button type="button" onClick={() => onReplay(result.replay!)}>
          Replay failing test
        </button>
      )}
    </div>
  );
}
