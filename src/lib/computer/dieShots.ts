// Die photos for the DieZoom demo, and the math to show them: which tiles a
// view needs, how big a coin is next to the die, and what a scale bar says.
// Tiles come from src/scripts/computer/makeDieTiles.ts.

export type Rect = { x: number; y: number; width: number; height: number };

export type DieSpot = {
  id: string;
  /** A closer view inside another spot. */
  parentId?: string;
  /** Key label, e.g. "L2 CACHE". */
  label: string;
  /** Short label that fits the outline in the whole-chip view. */
  mapLabel?: string;
  /** A matched core layout identifies the region, with an approximate outline. */
  matchedSource?: { label: string; url: string };
  /** The source proposes this identification but has not established it. */
  candidate?: boolean;
  /** Too small to hold its name at any useful zoom: the name sits just outside it. */
  labelOutside?: boolean;
  /** Where it is, in pixels of the full-size photo. With an outline, its bounding box. */
  rect: Rect;
  /** The region's real shape, clockwise, where a rectangle would cut through circuits. */
  outline?: [number, number][];
  /** Where the label goes when the bounding box's top-left corner is outside the outline. */
  labelRect?: Rect;
};

export type DieShot = {
  id: string;
  chip: string;
  /** e.g. "1999 · 0.25 µm". */
  detail: string;
  /** Size of the full photo. */
  width: number;
  height: number;
  tileSize: number;
  /** Width of each tile level, smallest first, as makeDieTiles wrote them. */
  levelWidths: number[];
  /** Asset folder of the tiles: <folder>/<level>/<column>_<row>.jpg */
  folder: string;
  /** Die size, from the published area and the photo's proportions. */
  areaMm2: number;
  /** The circuitry without the added L2 cache: all the small regions lie in here. */
  core: Rect;
  credit: { author: string; license: string; url: string; source: string };
  spots: DieSpot[];
};

/** Whether a photo pixel lies inside a spot's outline, or inside its box if it has none. */
export function spotContains(spot: Pick<DieSpot, "rect" | "outline">, x: number, y: number) {
  const { rect, outline } = spot;
  if (x < rect.x || x > rect.x + rect.width || y < rect.y || y > rect.y + rect.height) return false;
  if (!outline) return true;
  let inside = false;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const [xi, yi] = outline[i];
    const [xj, yj] = outline[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** The tile levels makeDieTiles writes: halving down to the first one wider than half a tile. */
export function tileLevelWidths(width: number, height: number, tileSize: number): number[] {
  const top = Math.ceil(Math.log2(Math.max(width, height)));
  const widths: number[] = [];
  for (let level = 0; level <= top; level++) {
    const levelWidth = Math.ceil(width / 2 ** (top - level));
    if (levelWidth >= tileSize / 2) widths.push(levelWidth);
  }
  return widths;
}

const DIXON_WIDTH = 22036;
const DIXON_HEIGHT = 13288;
const P6_CORE_MAP = {
  label: "Deschutes P6 core map",
  url: "https://nand2mario.github.io/wiki/p6/roms/",
};

export const PENTIUM_II_DIXON: DieShot = {
  id: "pentium-ii-dixon",
  chip: "INTEL PENTIUM II",
  detail: "MOBILE · 1999 · 0.25 µm",
  width: DIXON_WIDTH,
  height: DIXON_HEIGHT,
  tileSize: 640,
  levelWidths: tileLevelWidths(DIXON_WIDTH, DIXON_HEIGHT, 640),
  folder: "/assets/computer/die-shots/pentium-ii-dixon",
  // Microprocessor Report, 25 January 1999: "Dixon measures 180 mm2 in
  // Intel's 0.25-micron process". The photo is cropped at the die's edge.
  areaMm2: 180,
  core: { x: 8309, y: 846, width: 13043, height: 11609 },
  credit: {
    author: "Martijn Boer",
    license: "Public domain",
    url: "https://commons.wikimedia.org/wiki/File:Intel-pentium-ii-dixon-die-shot-high-resolution-stitched.jpg",
    source: "Wikimedia Commons",
  },
  // L2 cache, decoder and alignment boxes follow the Commons image notes. Other
  // regions match the rotated Deschutes core layout. Every edge runs along a
  // channel of the photo; dieShots.sources.md says how they were traced.
  spots: [
    {
      id: "cache",
      label: "L2 CACHE",
      rect: { x: 55, y: 634, width: 7575, height: 12130 },
    },
    {
      id: "l1-data",
      label: "L1 DATA CACHE",
      matchedSource: P6_CORE_MAP,
      rect: { x: 13682, y: 9073, width: 2858, height: 3377 },
      outline: [
        [13703, 9086],
        [14428, 9086],
        [14428, 9073],
        [16540, 9073],
        [16540, 12450],
        [13682, 12450],
        [13682, 9600],
        [13703, 9600],
      ],
      labelRect: { x: 13703, y: 9086, width: 2837, height: 3364 },
    },
    {
      id: "l1-instructions",
      label: "L1 INSTRUCTION CACHE",
      mapLabel: "L1 CODE",
      matchedSource: P6_CORE_MAP,
      rect: { x: 18814, y: 6960, width: 2531, height: 4178 },
    },
    {
      id: "microcode",
      label: "MICROCODE ROM",
      mapLabel: "MICROCODE",
      matchedSource: P6_CORE_MAP,
      rect: { x: 18929, y: 846, width: 2416, height: 1614 },
    },
    {
      id: "floating-point",
      label: "FLOATING POINT",
      matchedSource: P6_CORE_MAP,
      rect: { x: 8309, y: 858, width: 4377, height: 1806 },
      outline: [
        [8309, 858],
        [12686, 858],
        [12686, 2664],
        [11540, 2664],
        [11540, 2646],
        [11282, 2646],
        [11282, 2664],
        [9409, 2664],
        [9409, 2552],
        [8309, 2552],
      ],
    },
    {
      id: "integer",
      label: "INTEGER ARITHMETIC",
      mapLabel: "INTEGER",
      matchedSource: P6_CORE_MAP,
      rect: { x: 9430, y: 2650, width: 3268, height: 2485 },
      outline: [
        [9430, 2668],
        [11278, 2668],
        [11278, 2650],
        [11544, 2650],
        [11544, 2668],
        [12698, 2668],
        [12698, 5010],
        [11130, 5010],
        [11130, 5135],
        [9430, 5135],
      ],
    },
    {
      id: "mmx",
      label: "MMX",
      matchedSource: P6_CORE_MAP,
      rect: { x: 12722, y: 846, width: 1406, height: 4202 },
      outline: [
        [12722, 846],
        [14128, 846],
        [14128, 4820],
        [14108, 4820],
        [14108, 5048],
        [12722, 5048],
      ],
    },
    {
      id: "scheduler",
      label: "SCHEDULER",
      mapLabel: "SCHED.",
      matchedSource: P6_CORE_MAP,
      rect: { x: 14800, y: 846, width: 1810, height: 4122 },
    },
    {
      id: "branch-predictor",
      label: "BRANCH PREDICTION",
      matchedSource: P6_CORE_MAP,
      rect: { x: 17382, y: 11146, width: 3970, height: 1304 },
    },
    {
      id: "decoders",
      label: "X86 DECODERS",
      mapLabel: "DECODERS",
      rect: { x: 16552, y: 2472, width: 4793, height: 3726 },
      outline: [
        [18929, 2472],
        [21345, 2472],
        [21345, 6198],
        [16552, 6198],
        [16552, 4985],
        [16640, 4985],
        [16640, 3895],
        [17490, 3895],
        [17490, 3670],
        [18929, 3670],
      ],
      labelRect: { x: 18929, y: 2472, width: 2416, height: 1198 },
    },
    {
      id: "full-decoder",
      parentId: "decoders",
      label: "FULL DECODER",
      rect: { x: 19517, y: 3721, width: 801, height: 1665 },
    },
    {
      id: "simple-decoder-1",
      parentId: "decoders",
      label: "SIMPLE DECODER 1",
      rect: { x: 18428, y: 3860, width: 441, height: 441 },
    },
    {
      id: "simple-decoder-2",
      parentId: "decoders",
      label: "SIMPLE DECODER 2",
      rect: { x: 18428, y: 5017, width: 441, height: 441 },
    },
    {
      id: "fetch",
      label: "INSTRUCTION FETCH",
      mapLabel: "FETCH",
      matchedSource: P6_CORE_MAP,
      rect: { x: 16552, y: 6208, width: 2252, height: 6242 },
      outline: [
        [16552, 6208],
        [18804, 6208],
        [18804, 11138],
        [17372, 11138],
        [17372, 12450],
        [16694, 12450],
        [16694, 12262],
        [16552, 12262],
      ],
    },
    {
      id: "instruction-buffer",
      parentId: "fetch",
      label: "INSTRUCTION BUFFER",
      mapLabel: "BUFFER",
      matchedSource: P6_CORE_MAP,
      rect: { x: 16872, y: 6379, width: 1758, height: 1952 },
    },
    {
      id: "rename",
      label: "REGISTER RENAMING",
      mapLabel: "RENAME",
      matchedSource: P6_CORE_MAP,
      rect: { x: 12636, y: 4980, width: 3904, height: 2340 },
      outline: [
        [12636, 5060],
        [14118, 5060],
        [14118, 4980],
        [16540, 4980],
        [16540, 7295],
        [14425, 7295],
        [14425, 7320],
        [12712, 7320],
        [12712, 5285],
        [12636, 5285],
      ],
    },
    {
      id: "retirement",
      label: "REORDER / RETIREMENT",
      mapLabel: "RETIRE",
      matchedSource: P6_CORE_MAP,
      rect: { x: 16646, y: 846, width: 2275, height: 3029 },
      outline: [
        [16646, 846],
        [18921, 846],
        [18921, 3650],
        [17470, 3650],
        [17470, 3875],
        [16646, 3875],
      ],
    },
    {
      id: "memory-order",
      label: "MEMORY ORDERING",
      mapLabel: "MOB",
      matchedSource: P6_CORE_MAP,
      rect: { x: 9786, y: 5050, width: 2916, height: 2622 },
      outline: [
        [9786, 5165],
        [11145, 5165],
        [11145, 5050],
        [12628, 5050],
        [12628, 5300],
        [12702, 5300],
        [12702, 7672],
        [9786, 7672],
      ],
      labelRect: { x: 9786, y: 5165, width: 2842, height: 2507 },
    },
    {
      id: "dtlb",
      label: "ADDRESS TRANSLATION",
      mapLabel: "DTLB",
      matchedSource: P6_CORE_MAP,
      rect: { x: 11180, y: 9605, width: 2494, height: 2850 },
    },
    {
      id: "dtlb-storage",
      parentId: "dtlb",
      label: "TRANSLATION STORAGE",
      mapLabel: "DTLB STORAGE",
      matchedSource: P6_CORE_MAP,
      rect: { x: 12713, y: 11360, width: 957, height: 1085 },
    },
    {
      id: "allocate",
      label: "ALLOCATION",
      mapLabel: "ALLOC",
      matchedSource: P6_CORE_MAP,
      rect: { x: 14438, y: 7299, width: 830, height: 1767 },
    },
    {
      id: "bus-interface",
      label: "BUS INTERFACE",
      mapLabel: "BUS",
      matchedSource: P6_CORE_MAP,
      rect: { x: 8328, y: 5530, width: 6090, height: 6925 },
      outline: [
        [8328, 5530],
        [9772, 5530],
        [9772, 7678],
        [12712, 7678],
        [12712, 7328],
        [14418, 7328],
        [14418, 9080],
        [13695, 9080],
        [13695, 9585],
        [11162, 9585],
        [11162, 12455],
        [8328, 12455],
      ],
    },
    {
      id: "branch-address",
      label: "BRANCH ADDRESSES",
      mapLabel: "BAC",
      matchedSource: P6_CORE_MAP,
      rect: { x: 15280, y: 7299, width: 1260, height: 1767 },
    },
    {
      id: "page-miss",
      label: "PAGE-MISS HANDLER",
      mapLabel: "PMH",
      matchedSource: P6_CORE_MAP,
      rect: { x: 8318, y: 2565, width: 1454, height: 2909 },
      outline: [
        [8318, 2565],
        [9402, 2565],
        [9402, 2700],
        [9418, 2700],
        [9418, 5147],
        [9772, 5147],
        [9772, 5474],
        [8318, 5474],
      ],
    },
    {
      id: "fp-conversion",
      parentId: "floating-point",
      label: "FP CONVERSION",
      matchedSource: P6_CORE_MAP,
      rect: { x: 11395, y: 864, width: 1285, height: 1776 },
    },
    {
      id: "branch-storage",
      parentId: "branch-predictor",
      label: "BRANCH-TARGET STORAGE",
      mapLabel: "BTB STORAGE",
      matchedSource: P6_CORE_MAP,
      rect: { x: 19096, y: 11467, width: 2249, height: 970 },
    },
    {
      id: "fp-constants-candidate",
      parentId: "floating-point",
      label: "FP CONSTANT ROM?",
      mapLabel: "FROM?",
      candidate: true,
      matchedSource: P6_CORE_MAP,
      rect: { x: 11395, y: 864, width: 147, height: 1776 },
    },
    {
      id: "entry-pla-candidate",
      parentId: "decoders",
      label: "MICROCODE ENTRY PLA?",
      mapLabel: "ENTRY PLA?",
      candidate: true,
      matchedSource: P6_CORE_MAP,
      rect: { x: 19566, y: 3452, width: 729, height: 270 },
    },
    {
      id: "decoder-control-candidate",
      parentId: "decoders",
      label: "DECODER ALIAS CONTROL?",
      mapLabel: "ALIAS?",
      candidate: true,
      matchedSource: P6_CORE_MAP,
      rect: { x: 20404, y: 3457, width: 935, height: 865 },
    },
    {
      id: "retirement-registers-candidate",
      parentId: "retirement",
      label: "RETIREMENT REGISTERS?",
      mapLabel: "RRF?",
      candidate: true,
      matchedSource: P6_CORE_MAP,
      rect: { x: 16711, y: 3227, width: 674, height: 639 },
    },
    {
      id: "reorder-storage-candidate",
      parentId: "retirement",
      label: "REORDER BUFFER ARRAYS?",
      mapLabel: "ROB ARRAYS?",
      candidate: true,
      matchedSource: P6_CORE_MAP,
      rect: { x: 16649, y: 850, width: 1268, height: 1678 },
    },
    {
      id: "capacitor-candidate",
      parentId: "scheduler",
      label: "DECOUPLING CAPACITOR?",
      mapLabel: "CAPACITOR?",
      candidate: true,
      matchedSource: P6_CORE_MAP,
      rect: { x: 14182, y: 860, width: 608, height: 3962 },
    },
    {
      id: "alignment",
      label: "ALIGNMENT MARK",
      labelOutside: true,
      rect: { x: 16546, y: 12285, width: 140, height: 155 },
    },
  ],
};

export type Coin = {
  id: string;
  label: string;
  /** In a sentence: "the nickel". */
  name: string;
  diameterMm: number;
  image: string;
};

// Diameters from the US Mint and the European Central Bank.
// Photograph sources and CC0 dedications: public/images/computer/coins/LICENSE.md.
export const COINS: Coin[] = [
  {
    id: "nickel",
    label: "US NICKEL",
    name: "nickel",
    diameterMm: 21.21,
    image: "/images/computer/coins/nickel-2005.webp",
  },
  {
    id: "euro",
    label: "1 EURO",
    name: "1 euro coin",
    diameterMm: 23.25,
    image: "/images/computer/coins/euro-2003.webp",
  },
];

/** The die's width and height in millimetres. */
export function dieSizeMm(shot: DieShot) {
  const aspect = shot.width / shot.height;
  const height = Math.sqrt(shot.areaMm2 / aspect);
  return { width: height * aspect, height };
}

/** Millimetres per pixel of the full-size photo. */
export const mmPerPixel = (shot: DieShot) => dieSizeMm(shot).width / shot.width;

/** The coin to scale, beside the die on the right, centred on it vertically. */
export function coinPlacement(shot: DieShot, coin: Coin) {
  const perMm = 1 / mmPerPixel(shot);
  const diameter = coin.diameterMm * perMm;
  const gap = 2 * perMm;
  return { x: shot.width + gap, y: shot.height / 2 - diameter / 2, diameter };
}

/** Everything the view can show: the die and the coin beside it. */
export function worldBounds(shot: DieShot, coin: Coin): Rect {
  const placed = coinPlacement(shot, coin);
  const top = Math.min(0, placed.y);
  const bottom = Math.max(shot.height, placed.y + placed.diameter);
  return { x: 0, y: top, width: placed.x + placed.diameter, height: bottom - top };
}

/** A view: the photo pixel at the centre of the screen, and screen pixels per photo pixel. */
export type View = { x: number; y: number; scale: number };

/** The view that shows `rect` whole, with a margin, in a viewport of the given size. */
export function fitView(
  rect: Rect,
  viewport: { width: number; height: number },
  margin = 0.08,
): View {
  const scale =
    Math.min(viewport.width / rect.width, viewport.height / rect.height) * (1 - 2 * margin);
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, scale };
}

/** Width of one character of a map label, its padding, and its height, in CSS pixels. */
export const LABEL_CHAR_PIXELS = 6.1;
export const LABEL_PADDING_PIXELS = 8;
export const LABEL_HEIGHT_PIXELS = 18;

export const labelWidth = (label: string) =>
  label.length * LABEL_CHAR_PIXELS + LABEL_PADDING_PIXELS;

/** The zoom at which a spot's map label fits inside its box. */
export function labelFitScale(spot: DieSpot) {
  const box = spot.labelRect ?? spot.rect;
  return Math.max(
    (labelWidth(spot.mapLabel ?? spot.label) + 6) / box.width,
    (LABEL_HEIGHT_PIXELS + 6) / box.height,
  );
}

/**
 * The first view: the whole die when every region's label fits there. A narrower
 * screen moves in on the core, where the small regions are, until they fit or
 * the core fills the screen.
 */
export function openingView(shot: DieShot, viewport: { width: number; height: number }): View {
  const die = fitView({ x: 0, y: 0, width: shot.width, height: shot.height }, viewport, 0.02);
  const needed = Math.max(
    ...shot.spots.filter((spot) => !spot.parentId && !spot.labelOutside).map(labelFitScale),
  );
  if (needed <= die.scale) return die;
  const core = fitView(shot.core, viewport, 0.02);
  return { ...core, scale: Math.max(die.scale, Math.min(needed, core.scale)) };
}

/**
 * A clockwise axis-aligned outline moved inward by `distance`. Neighbouring
 * regions share narrow channels, so this keeps their lines apart at every zoom.
 */
export function insetOutline(points: readonly (readonly [number, number])[], distance: number) {
  return points.map(([x, y], index) => {
    const [fromX, fromY] = points[(index + points.length - 1) % points.length];
    const [toX, toY] = points[(index + 1) % points.length];
    const inward = (ax: number, ay: number, bx: number, by: number) => ({
      x: -Math.sign(by - ay),
      y: Math.sign(bx - ax),
    });
    const before = inward(fromX, fromY, x, y);
    const after = inward(x, y, toX, toY);
    return [x + (before.x + after.x) * distance, y + (before.y + after.y) * distance] as const;
  });
}

/** The finest level a view needs, so each tile pixel covers at most one device pixel. */
export function levelFor(shot: DieShot, scale: number, pixelRatio = 1): number {
  const top = shot.levelWidths.length - 1;
  const wanted = shot.width * scale * Math.min(pixelRatio, 2);
  const level = shot.levelWidths.findIndex((width) => width >= wanted);
  return level === -1 ? top : level;
}

export type TilePlace = {
  key: string;
  level: number;
  column: number;
  row: number;
  /** Where the tile goes on screen, in CSS pixels, rounded so tiles meet. */
  left: number;
  top: number;
  width: number;
  height: number;
};

/** The tiles of `level` that the view can see, placed on screen. */
export function visibleTiles(
  shot: DieShot,
  level: number,
  view: View,
  viewport: { width: number; height: number },
): TilePlace[] {
  const levelWidth = shot.levelWidths[level];
  const photoPerTile = (shot.tileSize * shot.width) / levelWidth;
  const columns = Math.ceil(levelWidth / shot.tileSize);
  const rows = Math.ceil(((shot.height / shot.width) * levelWidth) / shot.tileSize);
  const screenX = (x: number) => Math.round(viewport.width / 2 + (x - view.x) * view.scale);
  const screenY = (y: number) => Math.round(viewport.height / 2 + (y - view.y) * view.scale);
  const left = view.x - viewport.width / 2 / view.scale;
  const top = view.y - viewport.height / 2 / view.scale;
  const firstColumn = Math.max(0, Math.floor(left / photoPerTile));
  const lastColumn = Math.min(
    columns - 1,
    Math.floor((left + viewport.width / view.scale) / photoPerTile),
  );
  const firstRow = Math.max(0, Math.floor(top / photoPerTile));
  const lastRow = Math.min(
    rows - 1,
    Math.floor((top + viewport.height / view.scale) / photoPerTile),
  );
  const tiles: TilePlace[] = [];
  for (let row = firstRow; row <= lastRow; row++) {
    for (let column = firstColumn; column <= lastColumn; column++) {
      const x0 = screenX(column * photoPerTile);
      const y0 = screenY(row * photoPerTile);
      tiles.push({
        key: `${level}/${column}_${row}`,
        level,
        column,
        row,
        left: x0,
        top: y0,
        width: screenX((column + 1) * photoPerTile) - x0,
        height: screenY((row + 1) * photoPerTile) - y0,
      });
    }
  }
  return tiles;
}

/** A scale bar of a round length that is 60 to 150 CSS pixels long. */
export function scaleBar(micronsPerScreenPixel: number) {
  const target = 100 * micronsPerScreenPixel;
  const power = 10 ** Math.floor(Math.log10(target));
  const step = [1, 2, 5, 10].find((factor) => factor * power >= target / 1.5) ?? 10;
  const microns = step * power;
  const label =
    microns >= 1000 ? `${formatNumber(microns / 1000)} mm` : `${formatNumber(microns)} µm`;
  return { microns, pixels: microns / micronsPerScreenPixel, label };
}

/** A length in millimetres, in the unit that reads best. */
export function formatLength(mm: number) {
  if (mm >= 10) return `${formatNumber(Math.round(mm))} mm`;
  if (mm >= 1) return `${formatNumber(Math.round(mm * 10) / 10)} mm`;
  const microns = mm * 1000;
  if (microns >= 10) return `${formatNumber(Math.round(microns))} µm`;
  return `${formatNumber(Math.round(microns * 10) / 10)} µm`;
}

const formatNumber = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 1 });
