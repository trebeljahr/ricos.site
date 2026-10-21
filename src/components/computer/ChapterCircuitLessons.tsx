import { useState } from "react";
import { DecoderDemo } from "./AddressRouting";
import { TransistorGates } from "./TransistorGates";
import { LazyLogicTutorial } from "./tutorial/LazyLogicTutorial";

/** Build from the behavior goal before choosing to reveal a complete decoder. */
export function DecoderLesson() {
  const [revealed, setRevealed] = useState(false);
  return (
    <section className="not-prose my-8" aria-label="Build and explore a decoder">
      <LazyLogicTutorial title="Build a two-to-four decoder" levels={["decoder"]} />
      <details className="my-6" onToggle={(event) => setRevealed(event.currentTarget.open)}>
        <summary className="cursor-pointer py-3 text-sm underline underline-offset-4">
          Compare a wired decoder
        </summary>
        {revealed && <DecoderDemo />}
      </details>
    </section>
  );
}

/** Existing transistor construction lessons and an optional exploration of complete gate wiring. */
export function TransistorGateLessons() {
  const [revealed, setRevealed] = useState(false);
  return (
    <section className="not-prose my-8" aria-label="Build and explore gates from transistors">
      <LazyLogicTutorial title="Build gates from transistors" levels={["cmos-not", "cmos-nand"]} />
      <details className="my-6" onToggle={(event) => setRevealed(event.currentTarget.open)}>
        <summary className="cursor-pointer py-3 text-sm underline underline-offset-4">
          Explore the wired transistor gates
        </summary>
        {revealed && <TransistorGates />}
      </details>
    </section>
  );
}
