// Shared hint-only lesson API. Future keyboard/interrupt lessons supply Level
// goal/spec/palette/hints and use this same behavior-driven policy. No reference
// matching, edit actions, or check-count-triggered disclosure belongs here.
import type { Circuit } from "../logic";
import { describeInputs, describeMiss, describeTick, type Grade } from "./grade";
import type { Level, LevelHint } from "./types";

export function contextualHint(level: Level, circuit: Circuit, grade?: Grade): LevelHint {
  if (grade?.kind === "structure") {
    const problem = grade.problems[0];
    return {
      text: `${problem.text} Trace the signal from an input toward the designated output. Which decision is still missing?`,
      anchor: problem.anchor,
    };
  }
  if (grade?.kind === "truth" && !grade.pass && level.spec.kind === "truth") {
    if (
      grade.rows.every(
        (row) => !row.unstable && row.actual.every((bit, i) => bit !== row.expected[i]),
      )
    )
      return {
        text: "Every checked output is opposite to the goal. Compare the meanings of 0 and 1 in your intermediate signals. Where does the meaning change?",
      };
    const row = grade.rows[grade.first];
    return {
      text: `Consider ${describeInputs(level.spec.inputs, row.inputs)}. ${describeMiss(level.spec.outputs, row)} Predict each intermediate signal for this case before editing.`,
    };
  }
  if (grade?.kind === "sequence" && !grade.pass && level.spec.kind === "sequence") {
    const tick = grade.ticks[grade.first];
    return {
      text: `First mismatch: ${tick.note} ${describeTick(level.spec.outputs, tick)} Compare this tick with the previous one. Is the rule about a level, a rising edge, or stored state?`,
    };
  }
  if (grade?.kind === "custom" && !grade.pass)
    return {
      text: `${grade.result.summary} Isolate one input case and predict what should reach each output.`,
    };
  if (!circuit.wires.length)
    return {
      text: "Start with one input case. What must each output mean, and which available block can express part of that decision?",
    };
  return {
    text: "Compare neighboring input cases. Which single change must affect the output? Check your prediction against the table or test sequence.",
  };
}

/** Called only after a learner explicitly asks. Dismissal resets depth to zero. */
export function requestedHints(
  level: Level,
  circuit: Circuit,
  grade: Grade | undefined,
  depth: number,
): LevelHint[] {
  if (depth <= 0) return [];
  return [
    contextualHint(level, circuit, grade),
    ...(level.hints ?? []).slice(0, Math.max(0, depth - 1)),
  ];
}
