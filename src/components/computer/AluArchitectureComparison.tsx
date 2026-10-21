import { useState } from "react";
import { layoutCircuit } from "src/lib/computer/circuitLayout";
import { CATALOG } from "src/lib/computer/tutorial/levels";
import { CircuitDemo } from "./CircuitDemo";
import { buttonClass, controlsClass } from "./DeviceDemoParts";

const REGIONS = [
  {
    id: "inputs",
    title: "Inputs",
    scott: "A and B word trunks feed several operation boxes.",
    chip: "A0/B0 through A3/B3 feed four repeated bit positions across the top.",
    boxes: [[7, 0, 84, 8]],
  },
  {
    id: "selection",
    title: "Operation selection",
    scott: "An operation decoder enables a complete result path.",
    chip: "S0–S3 and M change the intermediate Boolean terms inside the repeated gate networks. There is no separate whole-word AND box.",
    boxes: [
      [3, 0, 5, 15],
      [8, 12, 88, 27],
    ],
  },
  {
    id: "slice",
    title: "One bit position",
    scott: "The boxes name operations on a whole word.",
    chip: "Follow the first A/B pair through its upper gate clusters, then down to F0. The other three bit positions repeat this structure.",
    boxes: [
      [7, 22, 18, 17],
      [3, 80, 7, 19],
    ],
  },
  {
    id: "carry",
    title: "Carry network",
    scott: "The ADD path contains the adder and its carry wiring.",
    chip: "The middle network connects bit positions. Cn supplies carry in; Cn+4 and group P/G support carry between groups.",
    boxes: [
      [2, 41, 92, 38],
      [67, 90, 21, 9],
    ],
  },
  {
    id: "outputs",
    title: "Results and flags",
    scott: "The selected result reaches a word output. Carry and zero are separate flags.",
    chip: "F0–F3 are result bits. A=B requires the documented comparison setup. P/G are carry signals, and there is no separately labeled general ZERO output.",
    boxes: [[2, 92, 87, 7]],
  },
] as const;

function teachingSlice() {
  const circuit = CATALOG.builtInModule("alu-slice");
  if (!circuit) throw new Error("The ALU comparison requires the existing teaching bit slice");
  return layoutCircuit(structuredClone(circuit));
}

/** Structural guide to the supplied schematic; the interactive circuit reuses the teaching ALU. */
export function AluArchitectureComparison() {
  const [region, setRegion] = useState<(typeof REGIONS)[number]>(REGIONS[0]);
  const [sliceOpen, setSliceOpen] = useState(false);
  return (
    <section className="not-prose my-8" aria-label="Compare ALU architectures">
      <h3 className="mb-4 text-xl font-semibold">Follow the same jobs through two ALU drawings</h3>
      <p className="mb-5 text-sm leading-relaxed">
        Scott’s diagram separates operations into boxes. The 74181 schematic shares Boolean terms
        across four bit positions and a carry network. Choose a job to locate its corresponding
        region.
      </p>
      <fieldset className={`${controlsClass} mb-5 border-0 p-0`}>
        <legend className="sr-only">Schematic region</legend>
        {REGIONS.map((item) => (
          <button
            type="button"
            key={item.id}
            className={buttonClass}
            aria-pressed={region.id === item.id}
            onClick={() => setRegion(item)}
          >
            {item.title}
          </button>
        ))}
      </fieldset>
      <div
        className="mb-5 grid gap-4 border-y border-gray-300 py-4 text-sm leading-relaxed dark:border-gray-700"
        aria-live="polite"
      >
        <p>
          <strong>Scott’s ALU:</strong> {region.scott}
        </p>
        <p>
          <strong>74181:</strong> {region.chip}
        </p>
      </div>
      <figure className="m-0">
        <div className="relative overflow-hidden rounded border border-gray-300 bg-white">
          {/* biome-ignore lint/performance/noImgElement: show the supplied raster at its native aspect ratio with a direct full-size link */}
          <img
            src="/images/computer/74181-schematic.jpg"
            width={2056}
            height={1434}
            loading="lazy"
            alt="74181 ALU gate schematic: four A/B bit pairs feed function-selection gates and a shared carry network, with result F, equality and carry outputs below."
            className="block h-auto w-full"
          />
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {region.boxes.map(([x, y, width, height]) => (
              <rect
                key={`${x}:${y}`}
                x={x}
                y={y}
                width={width}
                height={height}
                fill="#13a58c"
                fillOpacity="0.12"
                stroke="#087b6a"
                strokeWidth="0.3"
              />
            ))}
          </svg>
        </div>
        <figcaption className="mt-3 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
          Highlighted: {region.title}. Highlights identify regions; they do not calculate 74181
          signal values.{" "}
          <a
            className="underline"
            href="/images/computer/74181-schematic.jpg"
            target="_blank"
            rel="noreferrer"
          >
            Open the full schematic
          </a>
          . Drawing by CrowbarBarbarian,{" "}
          <a className="underline" href="https://creativecommons.org/licenses/by-sa/4.0/">
            CC BY-SA 4.0
          </a>
          .{" "}
          <a
            className="underline"
            href="https://commons.wikimedia.org/wiki/File:74181aluschematic.svg"
          >
            Drawing source on Wikimedia Commons
          </a>
          . Rico supplied this raster screenshot; highlights were added for this comparison.
        </figcaption>
      </figure>
      <details className="my-6 text-sm leading-relaxed">
        <summary className="cursor-pointer py-2 font-medium underline underline-offset-4">
          Read the controls and polarity marks
        </summary>
        <ul className="my-3 list-disc space-y-2 pl-5">
          <li>
            M high selects logic; M low enables arithmetic carries. S0–S3 select the function:
            sixteen logic and sixteen arithmetic selections.
          </li>
          <li>
            The overbars matter. The datasheet gives separate active-high and active-low
            interpretations. Keep one interpretation consistent while tracing the drawing.
          </li>
          <li>
            Group P/G support carry look-ahead and cascading. They do not report zero, sign or
            signed overflow.
          </li>
          <li>
            A=B is not an unconditional equality flag for every operation. Use the datasheet’s
            specified subtraction/comparison setup.
          </li>
          <li>
            Scott’s dedicated left- and right-shift paths have no matching pair of boxes here. The
            two ALUs have different operation sets and control codes.
          </li>
        </ul>
        <p>
          Pin behavior and selection tables:{" "}
          <a className="underline" href="https://www.ti.com/lit/ds/symlink/sn54ls181.pdf">
            Texas Instruments 181-family datasheet
          </a>
          .
        </p>
      </details>
      <details className="my-6" onToggle={(event) => setSliceOpen(event.currentTarget.open)}>
        <summary className="cursor-pointer py-3 text-sm font-medium underline underline-offset-4">
          Try the teaching ALU’s reusable bit slice
        </summary>
        {sliceOpen && (
          <CircuitDemo makeCircuit={teachingSlice} label="Teaching ALU bit slice">
            This project’s existing bit slice uses its own smaller operation set and control codes.
            Flip its inputs and open the logic unit, full adder and selector to follow their gates.
          </CircuitDemo>
        )}
      </details>
      <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
        A gate schematic describes Boolean structure. It does not specify transistor layout or
        silicon area.
      </p>
    </section>
  );
}
