import { useState } from "react";
import { loadProgram, PROCESSOR_LEVELS } from "../../lib/computer/tutorial/levels/processor";
import type { ExtraContext } from "./tutorial/LogicTutorial";
import { LogicTutorial } from "./tutorial/LogicTutorial";
import styles from "./tutorial/Tutorial.module.css";

const LEVEL_IDS = PROCESSOR_LEVELS.map((level) => level.id);
const LAST = LEVEL_IDS[LEVEL_IDS.length - 1];

/** Once the whole CPU passes: compile any program into its code ROM and run it. */
function ProgramRunner({ context }: { context: ExtraContext }) {
  const [source, setSource] = useState(
    "let x = 1;\nfor (let i = 0; i < 4; i++) {\n  x = x + x;\n}\nprint(x);",
  );
  const [message, setMessage] = useState("");
  const run = () => {
    try {
      const loaded = loadProgram(context.circuit(), source);
      context.handle?.show(loaded.circuit, 0);
      setMessage(`Loaded ${loaded.compiled.bytes.length} bytes. Press Run clock.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "That program does not compile.");
    }
  };
  return (
    <section className={styles.runner}>
      <h3 className={styles.subhead}>Run your own program</h3>
      <textarea
        value={source}
        onChange={(event) => setSource(event.target.value)}
        aria-label="Program source"
        rows={7}
      />
      <button type="button" className={styles.check} onClick={run}>
        Compile and load into my CPU
      </button>
      {message && <p className={styles.muted}>{message}</p>}
    </section>
  );
}

/**
 * The build-your-own-CPU ladder: the Processor levels of the logic tutorial,
 * with a program runner once the last level passes.
 */
export function CpuChallenge({
  level,
  onLevelChange,
}: {
  level: number;
  onLevelChange?: (level: number) => void;
}) {
  return (
    <LogicTutorial
      levels={LEVEL_IDS}
      level={`cpu-${level}`}
      sequential
      onLevelChange={(id) => onLevelChange?.(Number(id.replace("cpu-", "")))}
      extra={(context) =>
        context.level.id === LAST && context.solved ? <ProgramRunner context={context} /> : null
      }
    />
  );
}
