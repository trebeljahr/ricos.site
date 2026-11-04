import { useCallback, useMemo, useRef, useState } from "react";
import { identity, lerp, type Mat, multiply } from "src/lib/computer/graphics/matrix";
import styles from "./Graphics.module.css";
import { fixed, MatrixGrid, Slider, useAnimation } from "./GraphicsParts";

export type TransformParameter = {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  /** What the slider opens on. */
  start: number;
  /** The value that does nothing, which a half-done step eases out of. */
  rest: number;
  format?: (value: number) => string;
};

export type TransformKind = {
  name: string;
  /** A short button label. */
  label: string;
  parameters: readonly TransformParameter[];
  matrix: (values: Record<string, number>) => Mat;
};

export type TransformStep = { id: number; kind: string; values: Record<string, number> };

const MAX_STEPS = 6;

/** A list of transforms, how far along them to go, and the matrix they multiply into. */
export function useTransformStack(
  kinds: readonly TransformKind[],
  size: number,
  initial: readonly { kind: string; values?: Record<string, number> }[],
) {
  const nextId = useRef(initial.length);
  const startValues = useCallback(
    (name: string) => {
      const kind = kinds.find((candidate) => candidate.name === name);
      return Object.fromEntries((kind?.parameters ?? []).map((p) => [p.key, p.start]));
    },
    [kinds],
  );
  const [steps, setSteps] = useState<TransformStep[]>(() =>
    initial.map((step, id) => ({
      id,
      kind: step.kind,
      values: { ...startValues(step.kind), ...step.values },
    })),
  );
  // How many steps have run: 1.5 is the whole first step and half of the second.
  const [progress, setProgress] = useState(initial.length);
  const [playing, setPlaying] = useState(false);

  const partial = useCallback(
    (step: TransformStep, amount: number) => {
      const kind = kinds.find((candidate) => candidate.name === step.kind);
      if (!kind) return identity(size);
      const values = Object.fromEntries(
        kind.parameters.map((p) => [p.key, lerp(p.rest, step.values[p.key], amount)]),
      );
      return kind.matrix(values);
    },
    [kinds, size],
  );

  /** The product of everything done by a given progress. A later step multiplies on the left. */
  const matrixAt = useCallback(
    (at: number) => {
      let result = identity(size);
      steps.forEach((step, index) => {
        const amount = Math.max(0, Math.min(1, at - index));
        if (amount > 0) result = multiply(partial(step, amount), result);
      });
      return result;
    },
    [partial, size, steps],
  );

  /** The same steps in the opposite order, at the same progress. */
  const reversedAt = useCallback(
    (at: number) => {
      let result = identity(size);
      [...steps].reverse().forEach((step, index) => {
        const amount = Math.max(0, Math.min(1, at - index));
        if (amount > 0) result = multiply(partial(step, amount), result);
      });
      return result;
    },
    [partial, size, steps],
  );

  const stepMatrices = useMemo(() => steps.map((step) => partial(step, 1)), [partial, steps]);
  const current = useMemo(() => matrixAt(progress), [matrixAt, progress]);
  const whole = useMemo(() => matrixAt(steps.length), [matrixAt, steps.length]);

  useAnimation(playing, (seconds) => {
    const next = progress + seconds * 0.8;
    if (next >= steps.length) {
      setProgress(steps.length);
      setPlaying(false);
    } else {
      setProgress(next);
    }
  });

  const changeSteps = (next: TransformStep[]) => {
    setSteps(next);
    setProgress(next.length);
    setPlaying(false);
  };

  return {
    steps,
    progress,
    playing,
    current,
    whole,
    stepMatrices,
    matrixAt,
    reversedAt,
    setProgress: (value: number) => {
      setProgress(value);
      setPlaying(false);
    },
    play: () => {
      if (progress >= steps.length) setProgress(0);
      setPlaying(!playing);
    },
    add: (name: string) => {
      if (steps.length >= MAX_STEPS) return;
      const id = nextId.current++;
      changeSteps([...steps, { id, kind: name, values: startValues(name) }]);
    },
    remove: (id: number) => changeSteps(steps.filter((step) => step.id !== id)),
    move: (id: number, by: number) => {
      const from = steps.findIndex((step) => step.id === id);
      const to = from + by;
      if (from < 0 || to < 0 || to >= steps.length) return;
      const next = [...steps];
      [next[from], next[to]] = [next[to], next[from]];
      changeSteps(next);
    },
    setValue: (id: number, key: string, value: number) => {
      setSteps(
        steps.map((step) =>
          step.id === id ? { ...step, values: { ...step.values, [key]: value } } : step,
        ),
      );
      setProgress(steps.length);
      setPlaying(false);
    },
    full: steps.length >= MAX_STEPS,
  };
}

export type TransformStackState = ReturnType<typeof useTransformStack>;

/** The list of steps, with a slider per value and buttons to reorder and remove. */
export function TransformStackEditor({
  kinds,
  stack,
}: {
  kinds: readonly TransformKind[];
  stack: TransformStackState;
}) {
  return (
    <>
      <ol className={styles.ops}>
        {stack.steps.map((step, index) => {
          const kind = kinds.find((candidate) => candidate.name === step.kind);
          if (!kind) return null;
          return (
            <li
              key={step.id}
              className={styles.op}
              data-active={stack.playing && Math.floor(stack.progress) === index ? "" : undefined}
            >
              <div className={styles.opHead}>
                <strong>
                  {index + 1} {kind.name}
                </strong>
                <span className={styles.opTools}>
                  <button
                    type="button"
                    className={`${styles.button} ${styles.iconButton}`}
                    aria-label={`Do ${kind.name} ${index + 1} earlier`}
                    disabled={index === 0}
                    onClick={() => {
                      stack.move(step.id, -1);
                    }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={`${styles.button} ${styles.iconButton}`}
                    aria-label={`Do ${kind.name} ${index + 1} later`}
                    disabled={index === stack.steps.length - 1}
                    onClick={() => {
                      stack.move(step.id, 1);
                    }}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className={`${styles.button} ${styles.iconButton}`}
                    aria-label={`Remove ${kind.name} ${index + 1}`}
                    onClick={() => {
                      stack.remove(step.id);
                    }}
                  >
                    ×
                  </button>
                </span>
              </div>
              <div className={styles.sliders}>
                {kind.parameters.map((parameter) => (
                  <Slider
                    key={parameter.key}
                    label={parameter.label}
                    value={step.values[parameter.key]}
                    min={parameter.min}
                    max={parameter.max}
                    step={parameter.step}
                    format={parameter.format}
                    onChange={(value) => stack.setValue(step.id, parameter.key, value)}
                  />
                ))}
              </div>
            </li>
          );
        })}
      </ol>
      <div className={styles.choiceRow}>
        {kinds.map((kind) => (
          <button
            key={kind.name}
            type="button"
            className={styles.button}
            disabled={stack.full}
            onClick={() => {
              stack.add(kind.name);
            }}
          >
            + {kind.label}
          </button>
        ))}
      </div>
    </>
  );
}

/** Scrubs through the steps, and plays them. */
export function TransformProgress({ stack }: { stack: TransformStackState }) {
  return (
    <div className={styles.choiceRow} style={{ alignItems: "center" }}>
      <button
        type="button"
        className={styles.button}
        aria-pressed={stack.playing}
        disabled={stack.steps.length === 0}
        onClick={stack.play}
      >
        {stack.playing ? "PAUSE" : "PLAY"}
      </button>
      <div style={{ flex: "1 1 180px", minWidth: 0 }}>
        <Slider
          label="STEP"
          value={stack.progress}
          min={0}
          max={Math.max(stack.steps.length, 0.001)}
          step={0.01}
          format={(value) => `${fixed(value, 1)}/${stack.steps.length}`}
          onChange={stack.setProgress}
        />
      </div>
    </div>
  );
}

/** M = last × … × first, each with its own numbers, and what they multiply into. */
export function TransformChain({
  kinds,
  stack,
  digits = 2,
}: {
  kinds: readonly TransformKind[];
  stack: TransformStackState;
  digits?: number;
}) {
  const reversed = stack.steps
    .map((step, index) => ({ step, index, matrix: stack.stepMatrices[index] }))
    .reverse();
  return (
    <div className={styles.equation}>
      {reversed.map(({ step, index, matrix }, position) => (
        <span key={step.id} className={styles.equation}>
          {position > 0 && <span>×</span>}
          <MatrixGrid
            matrix={matrix}
            small
            digits={digits}
            label={`${index + 1} ${kinds.find((kind) => kind.name === step.kind)?.label ?? ""}`}
          />
        </span>
      ))}
      {reversed.length > 0 && <span>=</span>}
      <MatrixGrid matrix={stack.whole} axes small digits={digits} label="M" />
    </div>
  );
}
