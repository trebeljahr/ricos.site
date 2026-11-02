import clsx from "clsx";
import { useState } from "react";
import {
  UNIVERSAL_FAMILIES,
  type UniversalFamily,
  universalGateId,
  universalTargets,
} from "src/lib/computer/tutorial/levels/universalGates";
import { LazyLogicTutorial } from "./tutorial/LazyLogicTutorial";

/** One primitive family at a time; each target has its own draft, check and requested hints. */
export function UniversalGates({
  showEmbedTags = true,
  headingLevel = 2,
}: {
  showEmbedTags?: boolean;
  /** 5 sits under a heading inside a folded box, so it is smaller as well. */
  headingLevel?: 2 | 3 | 5;
} = {}) {
  const [family, setFamily] = useState<UniversalFamily>("nand");
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h5";
  return (
    <div className="not-prose">
      <fieldset className="mb-8 flex flex-wrap gap-2 border-0 p-0">
        <legend className="sr-only">Allowed gate primitive</legend>
        {UNIVERSAL_FAMILIES.map((primitive) => (
          <button
            type="button"
            key={primitive}
            aria-pressed={family === primitive}
            onClick={() => setFamily(primitive)}
            className="min-h-11 rounded border border-gray-300 px-4 py-2 text-sm text-gray-800 transition-colors hover:border-emerald-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600 aria-pressed:border-emerald-700 aria-pressed:bg-emerald-50 dark:border-gray-600 dark:text-gray-200 dark:aria-pressed:border-emerald-300 dark:aria-pressed:bg-emerald-950 motion-reduce:transition-none"
          >
            {primitive.toUpperCase()} only
          </button>
        ))}
      </fieldset>
      <p className="mb-10 max-w-prose text-sm leading-relaxed text-gray-600 dark:text-gray-400">
        Each challenge starts with inputs and an output. Use only {family.toUpperCase()} gates to
        match its truth table.
      </p>
      {universalTargets(family).map((target) => {
        const id = universalGateId(family, target);
        const title = `${target.toUpperCase()} from ${family.toUpperCase()}`;
        return (
          <section
            key={id}
            className="mb-16 border-t border-gray-300 pt-6 dark:border-gray-700"
            aria-label={title}
          >
            <Heading
              className={clsx(
                "mb-3 font-semibold tracking-tight text-gray-950 dark:text-white",
                headingLevel === 5 ? "text-lg" : "text-2xl",
              )}
            >
              {title}
            </Heading>
            {showEmbedTags && (
              <p className="mb-5 overflow-x-auto text-xs text-gray-500 dark:text-gray-400">
                <code>{`<LazyLogicTutorial levels={["${id}"]} />`}</code>
              </p>
            )}
            <LazyLogicTutorial title={title} levels={[id]} height="min(88svh, 880px)" />
          </section>
        );
      })}
    </div>
  );
}
