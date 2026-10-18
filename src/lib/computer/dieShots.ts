// Die photos for the DieZoom demo, and the math to show them: which tiles a
// view needs, how big a coin is next to the die, and what a scale bar says.
// Tiles come from src/scripts/computer/makeDieTiles.ts.

export type Rect = { x: number; y: number; width: number; height: number };

export type DieSpot = {
  id: string;
  /** Key label, e.g. "L2 CACHE". */
  label: string;
  /** One or two plain sentences for the LCD. */
  text: string;
  /** Where it is, in pixels of the full-size photo. */
  rect: Rect;
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
  credit: { author: string; license: string; url: string; source: string };
  spots: DieSpot[];
};

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
  credit: {
    author: "Martijn Boer",
    license: "Public domain",
    url: "https://commons.wikimedia.org/wiki/File:Intel-pentium-ii-dixon-die-shot-high-resolution-stitched.jpg",
    source: "Wikimedia Commons",
  },
  // From the image notes on the Commons file page.
  spots: [
    {
      id: "cache",
      label: "L2 CACHE",
      text: "256 KB of cache memory fills about a third of the die. The grid is the same memory cell, repeated about two million times.",
      rect: { x: 55, y: 634, width: 7575, height: 12130 },
    },
    {
      id: "decoders",
      label: "X86 DECODERS",
      text: "These circuits turn each x86 instruction into the small steps the core runs. One full decoder sits next to two simple ones.",
      rect: { x: 18300, y: 3650, width: 2200, height: 1900 },
    },
    {
      id: "alignment",
      label: "ALIGNMENT MARK",
      text: "Four arrows that lined up the masks while the chip was made, layer on layer. The whole mark is about 0.17 mm wide.",
      rect: { x: 16527, y: 12268, width: 220, height: 221 },
    },
  ],
};

export type Coin = {
  id: string;
  label: string;
  /** In a sentence: "the nickel". */
  name: string;
  /** Text stamped on the drawn coin. */
  face: string;
  diameterMm: number;
  /** Two colours: the face and the rim. */
  colors: [string, string];
  /** A ring of a second metal, for a two-metal coin. */
  ring?: string;
};

// Diameters from the US Mint, the European Central Bank and the Royal Australian Mint.
export const COINS: Coin[] = [
  {
    id: "nickel",
    label: "US NICKEL",
    name: "nickel",
    face: "5¢",
    diameterMm: 21.21,
    colors: ["#c9ccd0", "#8d939a"],
  },
  {
    id: "euro",
    label: "1 EURO",
    name: "1 euro coin",
    face: "1 €",
    diameterMm: 23.25,
    colors: ["#cfd1d4", "#9a8a52"],
    ring: "#d6c27a",
  },
  {
    id: "aud",
    label: "AU $1",
    name: "Australian dollar",
    face: "$1",
    diameterMm: 25,
    colors: ["#dcc06b", "#9c7f32"],
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

/**
 * CSS pixels per millimetre if a CSS pixel were its nominal 1/96 inch. Screens
 * differ, so a "real size" view is only close to real.
 */
export const CSS_PIXELS_PER_MM = 96 / 25.4;
