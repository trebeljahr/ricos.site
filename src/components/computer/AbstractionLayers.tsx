import type { CSSProperties, KeyboardEvent } from "react";
import { useId, useMemo, useState } from "react";
import {
  ABSTRACTION_LAYERS,
  type AbstractionLayer,
  dollsOut,
  holderOf,
  layerById,
  OPENABLE,
  REACHES,
} from "src/lib/computer/abstractionLayers";
import styles from "./AbstractionLayers.module.css";

/*
 * Every doll is drawn in the same local units: 100 tall, standing on y = 0,
 * centred on x = 0. On the shelves they are drawn at DOLL_SCALE.
 */
const WIDTH = 380;
const DOLL_SCALE = 0.46;
const DOLL_HEIGHT = 100 * DOLL_SCALE;
const SHELF_GAP = 60;
const FIRST_SHELF = 52;
const shelfY = (shelf: number) => FIRST_SHELF + shelf * SHELF_GAP;
const SHELF_THICKNESS = 11;

const SEAM_Y = -40;
const SEAM_RX = 33.6;
const SEAM_RY = 5;
// Where the lid of an opened doll goes: beside it on the shelf, tipped.
const LID_ASIDE = 62;
const LID_DROP = 40;
const LID_TILT = 16;

const DOLL_PATH =
  "M0 -100C14 -100 23 -91 23 -79C23 -70 20 -66 21 -62C27 -56 35 -44 35 -27C35 -10 30 0 22 0" +
  "L-22 0C-30 0 -35 -10 -35 -27C-35 -44 -27 -56 -21 -62C-20 -66 -23 -70 -23 -79C-23 -91 -14 -100 0 -100Z";
const SEAM_PATH = `M${-SEAM_RX} ${SEAM_Y}A${SEAM_RX} ${SEAM_RY} 0 0 0 ${SEAM_RX} ${SEAM_Y}`;
const TOP_CLIP = `M-60 -110H60V${SEAM_Y}H${SEAM_RX}A${SEAM_RX} ${SEAM_RY} 0 0 1 ${-SEAM_RX} ${SEAM_Y}H-60Z`;
const BOTTOM_CLIP = `M-60 ${SEAM_Y}H${-SEAM_RX}A${SEAM_RX} ${SEAM_RY} 0 0 0 ${SEAM_RX} ${SEAM_Y}H60V10H-60Z`;

/** The painted doll, whole. The halves are this drawing clipped at the seam. */
function DollArt({ color, shade }: { color: string; shade: string }) {
  return (
    <>
      <path d={DOLL_PATH} fill={color} />
      <path d={DOLL_PATH} fill={`url(#${shade})`} />
      <path d="M-21 -60Q0 -42 21 -60M-27 -51Q0 -32 27 -51" className={styles.collar} />
      <path d="M-28 -27Q-32 -16 -25 -8M28 -27Q32 -16 25 -8" className={styles.collar} />
      <ellipse cx="0" cy="-24" rx="25" ry="21" className={styles.apron} />
      <ellipse cx="0" cy="-24" rx="22.2" ry="18.2" className={styles.stitch} stroke={color} />
      <g fill={color}>
        <circle cx="-6" cy="-24" r="4" />
        <circle cx="6" cy="-24" r="4" />
        <circle cx="0" cy="-31" r="4" />
        <circle cx="0" cy="-17" r="4" />
      </g>
      <circle cx="0" cy="-24" r="2.8" className={styles.flowerHeart} />
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

type Ids = { top: string; bottom: string; shade: string };

function Doll({
  layer,
  isOut,
  isOpen,
  from,
  ids,
  onToggle,
}: {
  layer: AbstractionLayer;
  isOut: boolean;
  isOpen: boolean;
  /** The doll it goes back into when it is not out. */
  from: AbstractionLayer | null;
  ids: Ids;
  onToggle: () => void;
}) {
  const home = isOut || !from ? layer : from;
  const y = shelfY(home.shelf);
  const style: CSSProperties = {
    transform: `translate(${home.x}px, ${y}px) scale(${isOut ? DOLL_SCALE : DOLL_SCALE * 0.5})`,
    opacity: isOut ? 1 : 0,
  };
  const canOpen = layer.inside.length > 0;
  function onKeyDown(event: KeyboardEvent<SVGGElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onToggle();
  }
  const art = <DollArt color={layer.color} shade={ids.shade} />;
  // A native HTML button cannot contain this drawing.
  const control = !isOut
    ? { "aria-hidden": true }
    : canOpen
      ? {
          role: "button",
          tabIndex: 0,
          "aria-label": `${isOpen ? "Close" : "Open"}: ${layer.name}`,
          "aria-expanded": isOpen,
          onClick: onToggle,
          onKeyDown,
        }
      : { role: "img", "aria-label": layer.name };
  return (
    <g
      className={styles.doll}
      style={style}
      data-layer={layer.id}
      data-out={isOut}
      data-open={isOpen}
      {...control}
    >
      {canOpen ? (
        <>
          <ellipse cx="0" cy={SEAM_Y} rx={SEAM_RX - 0.8} ry={SEAM_RY} className={styles.hollow} />
          <g clipPath={`url(#${ids.bottom})`}>{art}</g>
          <path d={SEAM_PATH} className={styles.seam} />
          <g
            className={styles.lid}
            style={{
              transform: isOpen
                ? `translate(${LID_ASIDE}px, ${LID_DROP}px) rotate(${LID_TILT}deg)`
                : "translate(0px, 0px) rotate(0deg)",
            }}
          >
            <g clipPath={`url(#${ids.top})`}>{art}</g>
            <path d={SEAM_PATH} className={styles.seam} />
          </g>
          {/* The whole doll takes the click, wherever its lid has gone. */}
          <path d={DOLL_PATH} className={styles.target} />
        </>
      ) : (
        art
      )}
    </g>
  );
}

const waistOf = (layer: AbstractionLayer, side: -1 | 1) => ({
  x: layer.x + side * 15,
  y: shelfY(layer.shelf) - DOLL_HEIGHT * 0.3,
});

/** A slack thread from inside a doll to a doll inside it. It runs behind both of them. */
function insideThread(parent: AbstractionLayer, child: AbstractionLayer) {
  if (parent.shelf === child.shelf) {
    const side = child.x > parent.x ? 1 : -1;
    const a = waistOf(parent, side);
    const b = waistOf(child, side === 1 ? -1 : 1);
    return `M${a.x} ${a.y}Q${(a.x + b.x) / 2} ${a.y + 9} ${b.x} ${b.y}`;
  }
  const fromY = shelfY(parent.shelf) - DOLL_HEIGHT * 0.35;
  const toY = shelfY(child.shelf) - DOLL_HEIGHT * 0.5;
  const sag = 4;
  return `M${parent.x} ${fromY}Q${(parent.x + child.x) / 2} ${(fromY + toY) / 2 + sag} ${child.x} ${toY}`;
}

/** Each red thread by hand: they go round the shelves rather than through the dolls. */
const REACH_PATHS: Record<string, { d: string; label: readonly [number, number] }> = {
  "app>operating-system": { d: "M136 36Q190 24 244 36", label: [190, 24] },
  "compiler-assembler>app": { d: "M238 96C226 70 170 70 132 50", label: [200, 71] },
  "app>cpu": { d: "M105 40C40 60 20 160 80 214", label: [38, 128] },
  "input-output>operating-system": { d: "M305 214C368 170 356 60 275 40", label: [338, 128] },
  "operating-system>ram": { d: "M252 50C300 110 270 180 200 216", label: [272, 152] },
  "buses>ram": { d: "M148 262C160 250 174 244 183 226", label: [146, 247] },
  "buses>input-output": { d: "M156 272C200 258 262 256 282 226", label: [196, 259] },
};

/**
 * A computer as nesting dolls that do not nest in one line. Open a doll and what
 * is inside steps out onto the shelves. Usable in MDX articles.
 */
export function AbstractionLayers() {
  const [opened, setOpened] = useState<ReadonlySet<string>>(() => new Set());
  const [last, setLast] = useState<string | null>(null);
  const base = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const ids: Ids = { top: `${base}-top`, bottom: `${base}-bottom`, shade: `${base}-shade` };
  const out = useMemo(() => dollsOut(opened), [opened]);
  const allOpen = OPENABLE.every((id) => opened.has(id));
  // The cabinet grows downward as dolls step out, so nothing waits on empty shelves.
  const lowestShelf = Math.max(...[...out].map((id) => layerById(id).shelf));
  const height = shelfY(lowestShelf) + SHELF_THICKNESS + 9;

  function toggle(id: string) {
    setOpened((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
    setLast(id);
  }

  const lastLayer = last ? layerById(last) : null;

  return (
    <section className={`not-prose ${styles.demo}`} aria-label="A computer as nesting dolls">
      {/* biome-ignore lint/a11y/useSemanticElements: The SVG group holds the illustrated controls. */}
      <svg viewBox={`0 0 ${WIDTH} ${height}`} role="group" aria-label="Shelves of nesting dolls">
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

        {Array.from({ length: lowestShelf + 1 }, (_, shelf) => shelf).map((shelf) => (
          <rect
            key={shelf}
            x="0"
            y={shelfY(shelf)}
            width={WIDTH}
            height={SHELF_THICKNESS}
            className={styles.shelf}
          />
        ))}

        {ABSTRACTION_LAYERS.flatMap((parent) =>
          parent.inside.map((childId) => {
            const on = opened.has(parent.id) && out.has(parent.id);
            return (
              <path
                key={`${parent.id}>${childId}`}
                className={styles.thread}
                data-on={on}
                data-thread={`${parent.id}>${childId}`}
                d={insideThread(parent, layerById(childId))}
              />
            );
          }),
        )}

        {REACHES.map(({ from, to, label }) => {
          const key = `${from}>${to}`;
          const on = out.has(from) && out.has(to);
          const { d, label: at } = REACH_PATHS[key];
          return (
            <g key={key} className={styles.reach} data-on={on} data-reach={key}>
              <path d={d} />
              <text x={at[0]} y={at[1]}>
                {label}
              </text>
            </g>
          );
        })}

        {ABSTRACTION_LAYERS.map((layer) => (
          <text
            key={layer.id}
            className={styles.tag}
            data-on={out.has(layer.id)}
            x={layer.x}
            y={shelfY(layer.shelf) + 8.5}
          >
            {layer.tag}
          </text>
        ))}

        {ABSTRACTION_LAYERS.map((layer) => (
          <Doll
            key={layer.id}
            layer={layer}
            isOut={out.has(layer.id)}
            isOpen={opened.has(layer.id)}
            from={holderOf(layer.id, opened, out)}
            ids={ids}
            onToggle={() => toggle(layer.id)}
          />
        ))}
      </svg>
      <button
        type="button"
        className={styles.all}
        onClick={() => {
          setOpened(allOpen ? new Set() : new Set(OPENABLE));
          setLast(null);
        }}
      >
        {allOpen ? "Close all" : "Open all"}
      </button>
      <p className="sr-only" aria-live="polite">
        {lastLayer
          ? `${lastLayer.name}. ${lastLayer.does} ${
              opened.has(lastLayer.id)
                ? `Inside: ${lastLayer.inside.map((id) => layerById(id).name).join(", ")}.`
                : "Closed."
            }`
          : ""}
      </p>
    </section>
  );
}
