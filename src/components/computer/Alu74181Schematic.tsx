import { useState } from "react";
import { buttonClass, controlsClass } from "./DeviceDemoParts";

/** Boxes in percent of the drawing: x, y, width, height. */
const REGIONS = [
  { id: "inputs", title: "Inputs", boxes: [[7, 0, 84, 8]] },
  {
    id: "selection",
    title: "Operation select",
    boxes: [
      [3, 0, 5, 15],
      [8, 12, 88, 27],
    ],
  },
  {
    id: "slice",
    title: "One bit",
    boxes: [
      [7, 22, 18, 17],
      [3, 80, 7, 19],
    ],
  },
  {
    id: "carry",
    title: "Carry",
    boxes: [
      [2, 41, 92, 38],
      [67, 90, 21, 9],
    ],
  },
  { id: "outputs", title: "Outputs", boxes: [[2, 92, 87, 7]] },
] as const;

/** The 74181 ALU chip's gate drawing, one region highlighted at a time. */
export function Alu74181Schematic() {
  const [region, setRegion] = useState<(typeof REGIONS)[number]>(REGIONS[0]);
  return (
    <section className="not-prose my-8" aria-label="74181 ALU schematic">
      <fieldset className={`${controlsClass} mb-4 border-0 p-0`}>
        <legend className="sr-only">Highlight</legend>
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
      <figure className="m-0">
        <div className="relative overflow-hidden rounded border border-gray-300 bg-white">
          {/* biome-ignore lint/performance/noImgElement: show the supplied raster at its native aspect ratio */}
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
          Drawing by CrowbarBarbarian,{" "}
          <a className="underline" href="https://creativecommons.org/licenses/by-sa/4.0/">
            CC BY-SA 4.0
          </a>
          , via{" "}
          <a
            className="underline"
            href="https://commons.wikimedia.org/wiki/File:74181aluschematic.svg"
          >
            Wikimedia Commons
          </a>
          . Highlights added.
        </figcaption>
      </figure>
    </section>
  );
}
