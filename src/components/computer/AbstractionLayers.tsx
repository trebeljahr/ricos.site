import clsx from "clsx";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import {
  ABSTRACTION_LAYERS,
  type AbstractionLayer,
  clampDepth,
  INNERMOST,
  INNERMOST_NOTE,
  KEY_IDEA,
  PART_TITLES,
} from "src/lib/computer/abstractionLayers";
import styles from "./AbstractionLayers.module.css";

/*
 * Every doll is drawn in the same local units: 100 tall, standing on y = 0,
 * centred on x = 0. A doll sits inside its parent at SHRINK times the size.
 * When it is out, it rises RISE units (in its parent's units), so its feet
 * stay in the parent's bottom half. The camera undoes those steps one level at
 * a time. A jump of several layers opens or closes one doll after another.
 */
const SHRINK = 0.8;
const RISE = 29;
const SEAM_Y = -40;
const SEAM_RX = 33.6;
const SEAM_RY = 5;
// Where the lid of an opened doll goes: up, aside and tipped.
const LID_ASIDE = 72;
const LID_CENTRE = -70;
const LID_LIFTED = -88;
const LID_TILT = 14;
// A jump of several layers takes one step in or out every STEP_MS.
const STEP_MS = 210;

const DOLL_PATH =
  "M0 -100C14 -100 23 -91 23 -79C23 -70 20 -66 21 -62C27 -56 35 -44 35 -27C35 -10 30 0 22 0" +
  "L-22 0C-30 0 -35 -10 -35 -27C-35 -44 -27 -56 -21 -62C-20 -66 -23 -70 -23 -79C-23 -91 -14 -100 0 -100Z";
const SEAM_PATH = `M${-SEAM_RX} ${SEAM_Y}A${SEAM_RX} ${SEAM_RY} 0 0 0 ${SEAM_RX} ${SEAM_Y}`;
const TOP_CLIP = `M-60 -110H60V${SEAM_Y}H${SEAM_RX}A${SEAM_RX} ${SEAM_RY} 0 0 1 ${-SEAM_RX} ${SEAM_Y}H-60Z`;
const BOTTOM_CLIP = `M-60 ${SEAM_Y}H${-SEAM_RX}A${SEAM_RX} ${SEAM_RY} 0 0 0 ${SEAM_RX} ${SEAM_Y}H60V10H-60Z`;

/** Where the doll in view stands on the stage, and how tall it is drawn. */
function placement(depth: number) {
  if (depth === 0) return { x: 200, y: 244, size: 208 };
  // Each layer in is drawn a little smaller, so the dolls visibly shrink.
  const size = Math.max(150, 174 * 0.985 ** (depth - 1));
  return { x: 155, y: 40 + size, size };
}

/** No animation when the reader asks for less motion, or the browser cannot say. */
function prefersInstant() {
  return (
    typeof window.matchMedia !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** One step from `shown` toward `target`. */
const stepToward = (shown: number, target: number) => shown + Math.sign(target - shown);

function labelSize(lines: readonly string[]) {
  const longest = Math.max(...lines.map((line) => line.length));
  return lines.length > 1
    ? Math.min(8.5, 40 / (longest * 0.62))
    : Math.min(10, 42 / (longest * 0.62));
}

/** The painted doll, whole. The halves are this drawing clipped at the seam. */
function DollArt({ layer, shade }: { layer: AbstractionLayer; shade: string }) {
  const size = labelSize(layer.label);
  const baselines = layer.label.length > 1 ? [-23, -13.5] : [-17];
  return (
    <>
      <path d={DOLL_PATH} fill={layer.color} />
      <path d={DOLL_PATH} fill={`url(#${shade})`} />
      <path d="M-21 -60Q0 -42 21 -60M-27 -51Q0 -32 27 -51" className={styles.collar} />
      <path d="M-28 -27Q-32 -16 -25 -8M28 -27Q32 -16 25 -8" className={styles.collar} />
      <ellipse cx="0" cy="-24" rx="25" ry="21" className={styles.apron} />
      <ellipse cx="0" cy="-24" rx="22.2" ry="18.2" className={styles.stitch} stroke={layer.color} />
      {layer.label.map((line, index) => (
        <text
          key={line}
          x="0"
          y={baselines[index]}
          fontSize={size}
          textAnchor="middle"
          className={styles.paint}
        >
          {line}
        </text>
      ))}
      <g fill={layer.color}>
        <circle cx="-3.3" cy="-7" r="1.7" />
        <circle cx="3.3" cy="-7" r="1.7" />
        <circle cx="0" cy="-9.6" r="1.7" />
      </g>
      <circle cx="0" cy="-7.6" r="1.1" className={styles.flowerHeart} />
      <ellipse cx="0" cy="-79" rx="15.5" ry="15" className={styles.scarf} />
      <ellipse cx="0" cy="-79" rx="12.8" ry="12.4" className={styles.face} />
      <path
        d="M-12.4 -82C-10 -91.5 10 -91.5 12.4 -82C8 -86 4 -84.6 0 -87.2C-4 -84.6 -8 -86 -12.4 -82Z"
        className={styles.hair}
      />
      <circle cx="-4.6" cy="-79.4" r="1.35" className={styles.eye} />
      <circle cx="4.6" cy="-79.4" r="1.35" className={styles.eye} />
      <circle cx="-7.6" cy="-74.2" r="2.6" className={styles.cheek} />
      <circle cx="7.6" cy="-74.2" r="2.6" className={styles.cheek} />
      <ellipse cx="0" cy="-71" rx="2" ry="1.1" className={styles.mouth} />
      <path d={DOLL_PATH} className={styles.outline} />
    </>
  );
}

type StageIds = { top: string; bottom: string; shade: string };

/** One doll with every doll inside it. Opened dolls have their lid set aside. */
function Doll({ index, depth, ids }: { index: number; depth: number; ids: StageIds }) {
  const layer = ABSTRACTION_LAYERS[index];
  const out = index <= depth;
  const opened = index < depth;
  const style: CSSProperties = {
    transform: index === 0 ? undefined : `translate(0px, ${out ? -RISE : 0}px) scale(${SHRINK})`,
  };

  if (index === INNERMOST) {
    return (
      <g className={styles.doll} style={style} data-layer={layer.id}>
        <g className={clsx(depth === INNERMOST && styles.live)}>
          <DollArt layer={layer} shade={ids.shade} />
        </g>
      </g>
    );
  }

  return (
    <g className={styles.doll} style={style} data-layer={layer.id}>
      <ellipse cx="0" cy={SEAM_Y} rx={SEAM_RX - 0.8} ry={SEAM_RY} className={styles.hollow} />
      <Doll index={index + 1} depth={depth} ids={ids} />
      <g clipPath={`url(#${ids.bottom})`}>
        <DollArt layer={layer} shade={ids.shade} />
      </g>
      <path d={SEAM_PATH} className={styles.seam} />
      <g
        className={styles.lidAside}
        style={{
          transform: `translate(${opened ? LID_ASIDE : 0}px, 0px)`,
          // Only the lid of the doll just opened stays in view.
          opacity: index < depth - 1 ? 0 : 1,
        }}
      >
        <g
          className={styles.lidLift}
          style={{
            transform: `translate(0px, ${opened ? LID_LIFTED : LID_CENTRE}px) rotate(${opened ? LID_TILT : 0}deg) translate(0px, ${-LID_CENTRE}px)`,
          }}
        >
          <g clipPath={`url(#${ids.top})`}>
            <DollArt layer={layer} shade={ids.shade} />
          </g>
          <path d={SEAM_PATH} className={styles.seam} />
        </g>
      </g>
    </g>
  );
}

function DollStage({
  depth,
  from,
  label,
  ids,
}: {
  depth: number;
  from: number;
  label: string;
  ids: StageIds;
}) {
  const { x, y, size } = placement(depth);

  let world: ReactNode = (
    <g>
      <rect x="-4000" y="0" width="8000" height="7" className={styles.shelf} />
      <rect x="-4000" y="0" width="8000" height="1.2" className={styles.shelfEdge} />
      <ellipse cx="0" cy="0.5" rx="34" ry="3.2" className={styles.shadow} />
      <Doll index={0} depth={depth} ids={ids} />
    </g>
  );
  // The camera: the inverse of each step in, nested so it unwinds level by level.
  for (let level = 1; level <= INNERMOST; level++) {
    const active = level <= depth;
    world = (
      <g
        className={styles.zoom}
        style={{
          transform: active
            ? `scale(${1 / SHRINK}) translate(0px, ${RISE}px)`
            : "scale(1) translate(0px, 0px)",
        }}
      >
        {world}
      </g>
    );
  }

  return (
    <div className={styles.stage}>
      <svg
        viewBox="0 0 400 280"
        role="img"
        aria-label={label}
        data-direction={depth >= from ? "open" : "close"}
        data-depth={depth}
      >
        <defs>
          <clipPath id={ids.top} clipPathUnits="userSpaceOnUse">
            <path d={TOP_CLIP} />
          </clipPath>
          <clipPath id={ids.bottom} clipPathUnits="userSpaceOnUse">
            <path d={BOTTOM_CLIP} />
          </clipPath>
          <linearGradient id={ids.shade} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
            <stop offset="0.38" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.68" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <g
          className={styles.camera}
          style={{ transform: `translate(${x}px, ${y}px) scale(${size / 100})` }}
        >
          {world}
        </g>
      </svg>
    </div>
  );
}

/** A small doll for the list of layers; an opened one shows its lid lifted off. */
function MiniDoll({ color, open, ids }: { color: string; open: boolean; ids: StageIds }) {
  const body = (
    <>
      <path d={DOLL_PATH} fill={color} />
      <ellipse cx="0" cy="-79" rx="12.8" ry="12.4" className={styles.face} />
      <path d={DOLL_PATH} className={styles.miniOutline} />
    </>
  );
  return (
    <svg className={styles.miniDoll} viewBox="-40 -134 86 137" aria-hidden="true">
      {open ? (
        <>
          <g clipPath={`url(#${ids.bottom})`}>{body}</g>
          <g transform="translate(9 -30) rotate(18 0 -70)">
            <g clipPath={`url(#${ids.top})`}>{body}</g>
          </g>
        </>
      ) : (
        body
      )}
    </svg>
  );
}

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * A computer as a nesting doll. Open it layer by layer, from the app you are
 * using down to voltages on wires, or jump to any layer. Usable in MDX articles.
 */
export function AbstractionLayers() {
  // The explanation updates at once; the illustration opens one doll at a time.
  const [depth, setDepth] = useState(0);
  const [stage, setStage] = useState({ shown: 0, from: 0 });
  const openKey = useRef<HTMLButtonElement>(null);
  const explorer = useRef<HTMLDivElement>(null);
  const base = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const ids: StageIds = { top: `${base}-top`, bottom: `${base}-bottom`, shade: `${base}-shade` };
  const layer = ABSTRACTION_LAYERS[depth];
  const inner = depth < INNERMOST ? ABSTRACTION_LAYERS[depth + 1] : null;
  const total = ABSTRACTION_LAYERS.length;
  const shownLayer = ABSTRACTION_LAYERS[stage.shown];

  useEffect(() => {
    if (stage.shown === depth) return;
    const timer = window.setTimeout(
      () => setStage(({ shown }) => ({ shown: stepToward(shown, depth), from: shown })),
      STEP_MS,
    );
    return () => window.clearTimeout(timer);
  }, [depth, stage.shown]);

  function goTo(next: number) {
    const target = clampDepth(next);
    if (target === depth) return false;
    setDepth(target);
    const instant = prefersInstant();
    setStage(({ shown }) =>
      shown === target
        ? { shown, from: shown }
        : { shown: instant ? target : stepToward(shown, target), from: shown },
    );
    return true;
  }

  return (
    <section className={styles.demo} aria-label="A computer as a nesting doll of layers">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>The computer, layer by layer</p>
          <h2 className={styles.title}>There is more inside.</h2>
          <p className={styles.intro}>
            Open the dolls. Follow a route from the app on your screen to the voltages in its
            circuits.
          </p>
        </div>
        <span className={styles.edition} aria-hidden="true">
          {total} layers
          <br />
          one computer
        </span>
      </header>
      <div ref={explorer} className={styles.explorer}>
        <div className={styles.illustration}>
          <div className={styles.stageHeading}>
            <span className={styles.counter}>
              Layer {pad(depth + 1)} <span>/ {total}</span>
            </span>
            {depth > 0 && (
              <button
                type="button"
                className={styles.reset}
                onClick={() => {
                  goTo(0);
                  openKey.current?.focus();
                }}
                aria-label="Close every doll and go back to the app"
              >
                Start again ↺
              </button>
            )}
          </div>
          <DollStage
            depth={stage.shown}
            from={stage.from}
            label={
              stage.shown === 0
                ? `A closed nesting doll: ${shownLayer.name.toLowerCase()}.`
                : `A nesting doll opened ${stage.shown} ${stage.shown === 1 ? "time" : "times"}. The doll in view: ${shownLayer.name}.`
            }
            ids={ids}
          />
          <p className={styles.stageCaption} aria-hidden="true">
            {shownLayer.name}
          </p>
          <div className={styles.controls}>
            <button
              type="button"
              className={styles.back}
              onClick={() => goTo(depth - 1)}
              aria-disabled={depth === 0 || undefined}
              aria-label="Close the doll: go one layer out"
            >
              ← Close doll
            </button>
            <button
              ref={openKey}
              type="button"
              className={styles.open}
              onClick={() => goTo(depth + 1)}
              aria-disabled={depth === INNERMOST || undefined}
              aria-label="Open the doll: go one layer in"
            >
              {inner ? "Open doll" : "At the centre"} <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
        <div className={styles.explanation}>
          <div key={layer.id} className={styles.chapter}>
            <p className={styles.eyebrow}>
              Part {layer.part} · {PART_TITLES[layer.part]}
            </p>
            <h3 className={styles.layerName}>{layer.name}</h3>
            <p className={styles.description}>{layer.does}</p>
            <div className={styles.example}>
              <span className={styles.smallLabel}>For example</span>
              <p>{layer.example}</p>
            </div>
            <div className={styles.connection}>
              <span className={styles.smallLabel}>
                {inner ? "The next connection" : "From here, physics"}
              </span>
              <p>{inner ? layer.builtFrom : INNERMOST_NOTE}</p>
              {inner && (
                <button
                  type="button"
                  className={styles.nextLink}
                  onClick={() => {
                    goTo(depth + 1);
                    openKey.current?.focus();
                  }}
                >
                  Explore{" "}
                  {inner.name === "CPU" || inner.name === "RAM"
                    ? inner.name
                    : inner.name.toLowerCase()}{" "}
                  <span aria-hidden="true">↗</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className={styles.journey}>
        <div className={styles.journeyHeading}>
          <h3>The whole journey</h3>
          <span>Choose any layer to explore</span>
        </div>
        <ol className={styles.rail} aria-label="All layers, from the outside in">
          {ABSTRACTION_LAYERS.map((entry, index) => {
            const current = index === depth;
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  className={styles.railButton}
                  aria-current={current ? "true" : undefined}
                  data-state={index < depth ? "open" : current ? "current" : "inside"}
                  onClick={() => {
                    goTo(index);
                    openKey.current?.focus({ preventScroll: true });
                    explorer.current?.scrollIntoView?.({
                      block: "start",
                      behavior: prefersInstant() ? "instant" : "smooth",
                    });
                  }}
                  aria-label={`Layer ${index + 1} of ${total}: ${entry.name}, part ${entry.part} of the series.${current ? " In view." : ""}`}
                >
                  <span className={styles.railNumber}>{pad(index + 1)}</span>
                  <MiniDoll color={entry.color} open={index < depth} ids={ids} />
                  <span className={styles.railName}>{entry.name}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
      <p className={styles.note}>{KEY_IDEA}</p>
      <p className="sr-only" aria-live="polite">
        Layer {depth + 1} of {total}: {layer.name}. {layer.does}{" "}
        {inner ? `Next: ${inner.name}. ${layer.builtFrom}` : INNERMOST_NOTE}
      </p>
    </section>
  );
}
