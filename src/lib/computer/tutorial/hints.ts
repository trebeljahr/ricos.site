// Shared hint-only lesson API. Future keyboard/interrupt lessons supply Level
// goal/spec/palette/hints and use this same behavior-driven policy. No reference
// matching, edit actions, or check-count-triggered disclosure belongs here.
import { type Circuit, outputCount, outputLabel } from "../logic";
import { simplificationNote } from "./analysis";
import {
  describeInputs,
  describeMiss,
  describeTick,
  type Grade,
  gradePassed,
  partName,
  runRow,
  truthRows,
} from "./grade";
import { levelStart } from "./kit";
import type { Level, LevelHint } from "./types";

export function contextualHint(level: Level, circuit: Circuit, grade?: Grade): LevelHint {
  if (grade && gradePassed(grade)) {
    const note = simplificationNote(circuit, level, levelStart(level).locked);
    if (note) return { text: note.text };
  }
  if (grade?.kind === "structure") {
    const problem = grade.problems[0];
    const anchor = problem.anchor;
    const spec = level.spec;
    const port =
      spec.kind !== "custom" && anchor?.kind === "input"
        ? spec.outputs.find((output) => output.id === anchor.node)
        : undefined;
    if (port && !circuit.wires.some((wire) => wire.to === port.id)) {
      const connection = `${port.label}'s input pin has no wire attached. Finish the wire on that pin; passing nearby does not connect it.`;
      if (
        spec.kind === "truth" &&
        (spec.rows?.length ?? 2 ** spec.inputs.length) <= 16 &&
        circuit.nodes.length <= 64 &&
        level.sizeGoal?.metric !== "transistors"
      ) {
        const outputIndex = spec.outputs.indexOf(port);
        const rows = truthRows(spec).map((inputs) => ({
          expected: spec.fn(inputs)[outputIndex],
          snapshot: runRow(circuit, spec, inputs).snapshot,
        }));
        if (rows.every((row) => !row.snapshot.unstable)) {
          for (const node of circuit.nodes) {
            if (["lamp", "nmos", "pmos"].includes(node.type)) continue;
            for (let output = 0; output < outputCount(node); output++) {
              if (
                rows.every(
                  ({ expected, snapshot }) =>
                    (snapshot.outputs[node.id]?.[output] ?? Boolean(snapshot.values[node.id])) ===
                    expected,
                )
              )
                return {
                  text: `This ${partName(node)} ${outputLabel(node, output)} already matches every row for ${port.label}. Connect this output pin to ${port.label}'s input pin. Finish on the pin; passing nearby does not connect it.`,
                  anchor: { kind: "output", node: node.id, index: output },
                };
            }
          }
          if (level.hints?.some((hint) => hint.title === "Signal plan"))
            return {
              text: `${connection} None of the current signals matches ${port.label}'s truth table yet. Finish the remaining stages in the signal plan, then connect the final output.`,
              anchor,
            };
        }
      }
      return { text: connection, anchor };
    }
    return {
      text: problem.text,
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
      text: "Start with one input case. What must each output mean, and which available part can express part of that decision?",
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
  if (depth <= (level.hints?.length ?? 0)) return level.hints!.slice(0, depth);
  return [
    ...(level.hints ?? []),
    { ...contextualHint(level, circuit, grade), title: "Your circuit" },
  ].slice(0, depth);
}
