import clsx from "clsx";
import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTutorialProgress } from "../../../hooks/useTutorialProgress";
import { type Circuit, type Node, validateCircuit } from "../../../lib/computer/logic";
import { feedback, type Note } from "../../../lib/computer/tutorial/analysis";
import { type Grade, gradeLevel, gradePassed } from "../../../lib/computer/tutorial/grade";
import { levelStart } from "../../../lib/computer/tutorial/kit";
import { CATALOG, LEVELS, levelById } from "../../../lib/computer/tutorial/levels";
import {
  applyAction,
  describeAction,
  kindOf,
  matchReference,
  nextAction,
} from "../../../lib/computer/tutorial/matcher";
import { levelRows } from "../../../lib/computer/tutorial/paletteRows";
import { chosenVersion, partNode } from "../../../lib/computer/tutorial/parts";
import {
  markSkipped,
  markSolved,
  type Progress,
  progressStore,
  saveDraft,
} from "../../../lib/computer/tutorial/progress";
import type {
  HintAnchor,
  Level,
  PaletteRef,
  TutorialContext,
  TutorialStep,
} from "../../../lib/computer/tutorial/types";
import { LogicBuilder, type LogicBuilderHandle } from "../LogicBuilder";
import { type Callout, HintLayer } from "./HintLayer";
import { failureSentence, SpecView } from "./SpecView";
import styles from "./Tutorial.module.css";

export type LogicTutorialProps = {
  /** The level to open first. Default: the first level of `levels`. */
  level?: string;
  /** Level ids this tutorial offers, in order. Default: the whole ladder. */
  levels?: readonly string[];
  /** A level opens only once the main levels before it are solved or skipped. */
  sequential?: boolean;
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

type Checked = { circuit: Circuit; grade: Grade; notes: Note[]; stats?: StatsLine };
type StatsLine = { mine: string; reference?: string };

/** Truth tables this short are graded on every edit; longer ones on Check. */
const LIVE_ROWS = 16;
const SAVE_DELAY = 500;

const isOpen = (levels: readonly Level[], index: number, progress: Progress) =>
  levels
    .slice(0, index)
    .every(
      (level) => level.optional || progress.solved[level.id] || progress.skipped.includes(level.id),
    );

function restoreDraft(level: Level, progress: Progress, start: ReturnType<typeof levelStart>) {
  const draft = progress.drafts[level.id];
  const solved = progress.solved[level.id]?.circuit;
  const saved = draft ?? solved;
  if (saved == null) return start.circuit;
  try {
    const circuit = level.restore ? level.restore(saved) : (validateCircuit(saved) ?? undefined);
    return circuit ? start.enforce({ ...circuit, name: start.circuit.name }) : start.circuit;
  } catch {
    return start.circuit;
  }
}

const statusOf = (level: Level, progress: Progress) =>
  progress.solved[level.id] ? "✓" : progress.skipped.includes(level.id) ? "↷" : "";

/**
 * A tutorial in one circuit builder: the level's goal, steps, spec and check
 * sit in a column beside the canvas, hints point at parts in it, and solved
 * levels become parts in the palettes of later levels.
 */
export function LogicTutorial({
  level: requested,
  levels: ids,
  sequential = false,
  onLevelChange,
  extra,
}: LogicTutorialProps) {
  const ladder = useMemo(
    () =>
      ids
        ? ids.map((id) => levelById(id)).filter((level): level is Level => Boolean(level))
        : LEVELS,
    [ids],
  );
  const [levelId, setLevelId] = useState(() => levelById(requested)?.id ?? ladder[0]?.id);
  useEffect(() => {
    if (requested && levelById(requested)) setLevelId(requested);
  }, [requested]);
  const level = levelById(levelId) ?? ladder[0];
  const index = ladder.indexOf(level);
  const progress = useTutorialProgress();
  const start = useMemo(() => levelStart(level), [level]);
  const allowed = useMemo(() => CATALOG.allowed(level), [level]);
  const reference = useMemo(() => level.reference?.(), [level]);
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
  const [checked, setChecked] = useState<Checked | null>(null);
  const [checks, setChecks] = useState(0);
  const [hints, setHints] = useState(0);
  const [focus, setFocus] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const saveTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    circuitRef.current = initial;
    setCircuit(initial);
    setChecked(null);
    setChecks(0);
    setHints(0);
    setFocus(null);
    setNotice("");
  }, [initial]);
  useEffect(() => () => window.clearTimeout(saveTimer.current), []);

  const onChange = useCallback(
    (next: Circuit) => {
      circuitRef.current = next;
      setCircuit(next);
      window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(
        () => saveDraft(level.id, level.save ? level.save(next) : next),
        SAVE_DELAY,
      );
    },
    [level],
  );

  const live = useMemo(() => {
    if (level.spec.kind !== "truth") return undefined;
    const count = level.spec.rows?.length ?? 2 ** level.spec.inputs.length;
    if (count > LIVE_ROWS) return undefined;
    return gradeLevel(circuit, level, start.locked, allowed);
  }, [circuit, level, start, allowed]);
  const fresh = checked && checked.circuit === circuit ? checked : null;
  const grade = fresh?.grade ?? (live?.kind === "structure" ? undefined : live);
  const passing = Boolean((live && gradePassed(live)) || (fresh && gradePassed(fresh.grade)));
  const match = useMemo(
    () =>
      reference
        ? matchReference(circuit, reference, start.locked, CATALOG.gateParts)
        : new Map<string, string>(),
    [circuit, reference, start],
  );
  const context: TutorialContext = { circuit, match, passing, reference };
  const steps = level.steps ?? [];
  const stepDone = steps.map((step) => step.done(context));
  const current = stepDone.indexOf(false);
  const solved = Boolean(progress.solved[level.id]);
  const open = !sequential || isOpen(ladder, index, progress);

  const openLevel = (id: string) => {
    setLevelId(id);
    setOpened((value) => value + 1);
    onLevelChange?.(id);
  };
  const next = ladder[index + 1];

  const makeNode = (ref: Node): Node => {
    const id = crypto.randomUUID();
    const kind = kindOf(ref, CATALOG.gateParts);
    // A part on the palette goes in as the version the reader's setting picks.
    if (kind.startsWith("part:") && level.palette.includes(kind as PaletteRef)) {
      const [entry] = CATALOG.entries([kind as PaletteRef], progressStore.get());
      if (entry?.kind === "part") {
        const version = chosenVersion(entry, progress.settings.ownParts);
        return {
          ...partNode(entry, version === "own" ? "own" : "built-in"),
          id,
          x: ref.x,
          y: ref.y,
        } as Node;
      }
    }
    return { ...ref, id, module: ref.module, value: false };
  };

  const showMe = () => {
    if (!reference) return;
    const now = circuitRef.current;
    const action = nextAction(
      now,
      reference,
      matchReference(now, reference, start.locked, CATALOG.gateParts),
    );
    if (!action) {
      setNotice("Your wiring matches the reference. Press Check.");
      return;
    }
    setNotice("");
    handle.current?.apply(
      (board) => applyAction(board, action, makeNode),
      describeAction(action, now),
    );
  };

  const check = () => {
    const now = circuitRef.current;
    const result = gradeLevel(now, level, start.locked, allowed);
    let notes: Note[] = [];
    let stats: StatsLine | undefined;
    if (gradePassed(result)) {
      markSolved(level.id, level.makes ? now : undefined);
      if (level.spec.kind !== "custom") {
        const review = feedback(now, level, start.locked, {
          reference,
          known: CATALOG.known(level),
        });
        notes = review.notes;
        const transistors = review.stats.transistors > 0;
        const describe = (stats: typeof review.stats) =>
          `${stats.parts} part${stats.parts === 1 ? "" : "s"} · ${transistors ? `${stats.transistors} transistors` : `${stats.nands} NAND`} · depth ${stats.depth}`;
        stats = {
          mine: describe(review.stats),
          reference: review.reference && describe(review.reference),
        };
      }
    }
    setChecked({ circuit: now, grade: result, notes, stats });
    setChecks((value) => value + 1);
    setFocus(null);
  };

  const skip = () => {
    markSkipped(level.id);
    if (next) openLevel(next.id);
  };
  const reset = () => {
    saveDraft(level.id, null);
    handle.current?.load(start.circuit);
  };

  // One callout at a time: a problem from the last check, the current step, a note, or a hint.
  const problems = fresh?.grade.kind === "structure" ? fresh.grade.problems : [];
  const shownHints = (level.hints ?? []).filter(
    (hint, position) => position < hints || hint.when?.({ ...context, checks }),
  );
  const anchorOf = (anchor: TutorialStep["anchor"]) =>
    typeof anchor === "function" ? anchor(context) : anchor;
  const focused = focus !== null ? fresh?.notes[focus] : undefined;
  let callout: Callout | undefined;
  let rings: string[] = [];
  if (problems.length) {
    callout = { text: problems[0].text, anchor: problems[0].anchor, tone: "warn" };
    rings = problems.flatMap((problem) =>
      problem.anchor?.kind === "node" ? [problem.anchor.id] : [],
    );
  } else if (focused) {
    callout = { text: focused.text, anchor: focused.anchor, tone: focused.tone };
    rings = focused.nodes ?? [];
  } else if (current >= 0 && !passing) {
    callout = { text: steps[current].text, anchor: anchorOf(steps[current].anchor), tone: "step" };
  } else if (!passing && shownHints.length && shownHints[shownHints.length - 1].anchor) {
    const hint = shownHints[shownHints.length - 1];
    callout = { text: hint.text, anchor: hint.anchor as HintAnchor, tone: "tip" };
  }
  const customHighlight = fresh?.grade.kind === "custom" ? fresh.grade.result.highlight : undefined;

  const panel = (
    <div className={styles.panel}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>
          {level.section}
          {level.nandgame ? ` · NandGame: ${level.nandgame}` : ""}
        </span>
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
              value={level.id}
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
          {level.intro && <p className={styles.muted}>{level.intro}</p>}
          {level.chapter && (
            <p className={styles.chapter}>
              Read:{" "}
              <Link href={level.chapter.href}>
                {level.chapter.number} {level.chapter.title} →
              </Link>
            </p>
          )}

          {steps.length > 0 && (
            <ol className={styles.steps} aria-label="Steps">
              {steps.map((step, position) => (
                <li
                  key={step.text}
                  className={clsx(
                    stepDone[position] && styles.stepDone,
                    position === current && styles.stepCurrent,
                  )}
                  aria-current={position === current ? "step" : undefined}
                >
                  {step.text}
                </li>
              ))}
            </ol>
          )}

          <div className={styles.actions}>
            {reference && (
              <button
                type="button"
                onClick={showMe}
                title="Place the next part or wire of the reference solution"
              >
                Show me
              </button>
            )}
            {shownHints.length < (level.hints?.length ?? 0) && (
              <button type="button" onClick={() => setHints((value) => value + 1)}>
                Hint
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
              <button
                type="button"
                onClick={skip}
                title="Mark this level skipped and open the next one"
              >
                Skip
              </button>
            )}
          </div>
          {notice && <p className={styles.notice}>{notice}</p>}
          {shownHints.length > 0 && (
            <ul className={styles.hints} aria-label="Hints">
              {shownHints.map((hint) => (
                <li key={hint.text}>{hint.text}</li>
              ))}
            </ul>
          )}

          <h3 className={styles.subhead}>
            {level.spec.kind === "truth"
              ? "Truth table"
              : level.spec.kind === "sequence"
                ? "Test sequence"
                : "Check"}
          </h3>
          <SpecView spec={level.spec} grade={grade} />

          <button type="button" className={styles.check} onClick={check} data-tutorial-check="">
            Check
          </button>
          <div aria-live="polite">
            {fresh && (
              <Result
                level={level}
                checked={fresh}
                next={next}
                onNext={next ? () => openLevel(next.id) : undefined}
                onFocus={setFocus}
                focus={focus}
                onReplay={(replay) => handle.current?.show(replay.circuit, replay.halfCycles)}
              />
            )}
            {!fresh && checked && (
              <p className={styles.muted}>
                The board changed since the last check. Press Check again.
              </p>
            )}
            {!checked && solved && (
              <p className={styles.muted}>
                You solved this level before. Press Check to see the feedback again.
              </p>
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
      challenge={{
        circuit: initial,
        enforce: start.enforce,
        palette: [...allowed.gates],
        rows,
        highlight: customHighlight,
        onChange,
        handleRef: handle,
        panel,
        overlay: open ? <HintLayer callout={callout} rings={rings} /> : null,
      }}
    />
  );
}

function Result({
  level,
  checked,
  next,
  onNext,
  focus,
  onFocus,
  onReplay,
}: {
  level: Level;
  checked: Checked;
  next?: Level;
  onNext?: () => void;
  focus: number | null;
  onFocus: (index: number | null) => void;
  onReplay: (replay: { circuit: Circuit; halfCycles: number }) => void;
}) {
  const { grade } = checked;
  if (grade.kind === "structure")
    return (
      <div className={clsx(styles.result, styles.resultWarn)}>
        <p>The check cannot run yet:</p>
        <ul>
          {grade.problems.map((problem) => (
            <li key={problem.text}>{problem.text}</li>
          ))}
        </ul>
      </div>
    );
  if (grade.kind === "custom") {
    const { result } = grade;
    return (
      <div className={clsx(styles.result, result.pass ? styles.resultPass : styles.resultFail)}>
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
            Show me
          </button>
        )}
        {result.pass && onNext && (
          <button type="button" className={styles.nextButton} onClick={onNext}>
            Next: {next?.title} →
          </button>
        )}
      </div>
    );
  }
  if (!grade.pass)
    return (
      <div className={clsx(styles.result, styles.resultFail)}>
        <p>{failureSentence(level.spec, grade)}</p>
      </div>
    );
  const count = grade.kind === "truth" ? grade.rows.length : grade.ticks.length;
  return (
    <div className={clsx(styles.result, styles.resultPass)}>
      <p>
        Pass: all {count} {grade.kind === "truth" ? "rows" : "ticks"} match.
        {level.makes &&
          ` Your ${level.makes.label} is now a part in later levels and in the free builder.`}
      </p>
      {checked.stats && (
        <p className={styles.stats}>
          Yours: {checked.stats.mine}
          {checked.stats.reference && (
            <>
              <br />
              Reference: {checked.stats.reference}
            </>
          )}
        </p>
      )}
      {checked.notes.length > 0 && (
        <ul className={styles.notes}>
          {checked.notes.map((note, index) => (
            <li key={note.text} className={styles[note.tone]}>
              {note.anchor || note.nodes?.length ? (
                <button
                  type="button"
                  aria-pressed={focus === index}
                  onClick={() => onFocus(focus === index ? null : index)}
                >
                  {note.text}
                </button>
              ) : (
                note.text
              )}
            </li>
          ))}
        </ul>
      )}
      {onNext && (
        <button type="button" className={styles.nextButton} onClick={onNext}>
          Next: {next?.title} →
        </button>
      )}
    </div>
  );
}
