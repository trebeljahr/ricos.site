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
  /** One or two plain sentences for the LCD. */
  text: string;
  /** A matched core layout identifies the region, with an approximate outline. */
  matchedSource?: { label: string; url: string };
  /** The source proposes this identification but has not established it. */
  candidate?: boolean;
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
  credit: {
    author: "Martijn Boer",
    license: "Public domain",
    url: "https://commons.wikimedia.org/wiki/File:Intel-pentium-ii-dixon-die-shot-high-resolution-stitched.jpg",
    source: "Wikimedia Commons",
  },
  // L2 cache, decoder and alignment boxes follow the Commons image notes.
  // Other regions match the rotated Deschutes core layout; boundaries are
  // approximate. See dieShots.sources.md for the visual matches and sources.
  spots: [
    {
      id: "cache",
      label: "L2 CACHE",
      text: "256 KB of cache memory fills about a third of the die. The grid is the same memory cell, repeated about two million times.",
      rect: { x: 55, y: 634, width: 7575, height: 12130 },
    },
    {
      id: "l1-data",
      label: "L1 DATA CACHE",
      text: "16 KB holds recently used data close to the execution units. The regular memory arrays contrast with the surrounding logic.",
      matchedSource: P6_CORE_MAP,
      rect: { x: 13678, y: 9117, width: 2873, height: 3333 },
    },
    {
      id: "l1-instructions",
      label: "L1 INSTRUCTION CACHE",
      mapLabel: "L1 CODE",
      text: "A separate 16 KB cache holds instruction bytes. Keeping instructions and data in separate caches lets the core access both at once.",
      matchedSource: P6_CORE_MAP,
      rect: { x: 18810, y: 6976, width: 2540, height: 4166 },
    },
    {
      id: "microcode",
      label: "MICROCODE ROM",
      mapLabel: "MICROCODE",
      text: "This read-only memory stores sequences of micro-operations for complex instructions. Simple instructions take the decoder path instead.",
      matchedSource: P6_CORE_MAP,
      rect: { x: 18922, y: 840, width: 2428, height: 1626 },
    },
    {
      id: "floating-point",
      label: "FLOATING POINT",
      text: "Floating-point arithmetic handles numbers with fractions and a wide range of magnitudes. This region also includes nearby floating-point conversion logic.",
      matchedSource: P6_CORE_MAP,
      rect: { x: 8306, y: 856, width: 4390, height: 1832 },
    },
    {
      id: "integer",
      label: "INTEGER ARITHMETIC",
      mapLabel: "INTEGER",
      text: "Integer execution circuits add, subtract, shift and compare whole numbers. Their repeated structures sit beside the floating-point region.",
      matchedSource: P6_CORE_MAP,
      rect: { x: 9427, y: 2690, width: 3277, height: 2438 },
    },
    {
      id: "mmx",
      label: "MMX",
      text: "MMX applies one operation to several packed integers at once. These circuits helped process audio, images and other multimedia data.",
      matchedSource: P6_CORE_MAP,
      rect: { x: 12724, y: 828, width: 1446, height: 4220 },
    },
    {
      id: "scheduler",
      label: "SCHEDULER",
      mapLabel: "SCHED.",
      text: "The reservation station holds micro-operations until their inputs and execution units are ready. Ready work can run before older work that must wait.",
      matchedSource: P6_CORE_MAP,
      rect: { x: 14795, y: 840, width: 1799, height: 4144 },
    },
    {
      id: "branch-predictor",
      label: "BRANCH PREDICTION",
      text: "The branch target buffer helps predict where execution will go next. This lets the instruction fetch unit keep working before a branch finishes.",
      matchedSource: P6_CORE_MAP,
      rect: { x: 17382, y: 11142, width: 4052, height: 1316 },
    },
    {
      id: "decoders",
      label: "X86 DECODERS",
      mapLabel: "DECODERS",
      text: "These circuits turn each x86 instruction into the small steps the core runs. One full decoder sits next to two simple ones.",
      rect: { x: 18352, y: 3709, width: 2052, height: 1813 },
    },
    {
      id: "full-decoder",
      parentId: "decoders",
      label: "FULL DECODER",
      text: "Four translation arrays turn an x86 instruction into up to four micro-operations. Compare their size with either simple decoder beside them.",
      rect: { x: 19517, y: 3721, width: 801, height: 1665 },
    },
    {
      id: "simple-decoder-1",
      parentId: "decoders",
      label: "SIMPLE DECODER 1",
      text: "This smaller translation array handles instructions that need just one micro-operation. A second simple decoder does the same job below it.",
      rect: { x: 18428, y: 3860, width: 441, height: 441 },
    },
    {
      id: "simple-decoder-2",
      parentId: "decoders",
      label: "SIMPLE DECODER 2",
      text: "The second simple decoder also produces one micro-operation per instruction. These two small decoders sit beside the larger full decoder.",
      rect: { x: 18428, y: 5017, width: 441, height: 441 },
    },
    {
      id: "fetch",
      label: "INSTRUCTION FETCH",
      mapLabel: "FETCH",
      text: "The fetch unit brings instruction bytes from the instruction cache toward the decoders. It prepares the byte stream for finding instruction boundaries.",
      matchedSource: P6_CORE_MAP,
      rect: { x: 16553, y: 6206, width: 2247, height: 4882 },
    },
    {
      id: "instruction-buffer",
      parentId: "fetch",
      label: "INSTRUCTION BUFFER",
      mapLabel: "BUFFER",
      text: "Fetched instruction bytes wait here before decoding. The buffer helps keep the decoders supplied while instruction fetching continues.",
      matchedSource: P6_CORE_MAP,
      rect: { x: 16872, y: 6379, width: 1758, height: 1952 },
    },
    {
      id: "rename",
      label: "REGISTER RENAMING",
      mapLabel: "RENAME",
      text: "The register alias table maps register names to internal storage. Independent operations can reuse a name without waiting for an unrelated older result.",
      matchedSource: P6_CORE_MAP,
      rect: { x: 12711, y: 4984, width: 3836, height: 2338 },
    },
    {
      id: "retirement",
      label: "REORDER / RETIREMENT",
      mapLabel: "RETIRE",
      text: "The reorder buffer tracks unfinished operations and speculative results. Retirement commits completed work in program order, so wrong-path results can still be discarded.",
      matchedSource: P6_CORE_MAP,
      rect: { x: 16650, y: 836, width: 2270, height: 1756 },
    },
    {
      id: "memory-order",
      label: "MEMORY ORDERING",
      mapLabel: "MOB",
      text: "The memory order buffer tracks loads and stores. It lets memory operations overlap while preserving the ordering and dependencies that the program requires.",
      matchedSource: P6_CORE_MAP,
      rect: { x: 9778, y: 5128, width: 2926, height: 2550 },
    },
    {
      id: "dtlb",
      label: "ADDRESS TRANSLATION",
      mapLabel: "DTLB",
      text: "The data translation lookaside buffer caches virtual-to-physical address mappings and permissions. A cache hit avoids another walk through the page tables.",
      matchedSource: P6_CORE_MAP,
      rect: { x: 11175, y: 9381, width: 2502, height: 3093 },
    },
    {
      id: "dtlb-storage",
      parentId: "dtlb",
      label: "TRANSLATION STORAGE",
      mapLabel: "DTLB STORAGE",
      text: "This regular storage area holds cached address-translation information. Nearby comparison and control circuits decide whether a requested address has a matching entry.",
      matchedSource: P6_CORE_MAP,
      rect: { x: 12713, y: 11360, width: 963, height: 1098 },
    },
    {
      id: "allocate",
      label: "ALLOCATION",
      mapLabel: "ALLOC",
      text: "Allocation reserves tracking and scheduler entries for new micro-operations. If those resources are full, new work must wait for older operations to make room.",
      matchedSource: P6_CORE_MAP,
      rect: { x: 14439, y: 7300, width: 834, height: 1768 },
    },
    {
      id: "bus-interface",
      label: "BUS INTERFACE",
      mapLabel: "BUS",
      text: "Bus-interface and control circuits coordinate transactions outside the core. They move requests and data between the processor and the external memory system.",
      matchedSource: P6_CORE_MAP,
      rect: { x: 8326, y: 7647, width: 2699, height: 4819 },
    },
    {
      id: "branch-address",
      label: "BRANCH ADDRESSES",
      mapLabel: "BAC",
      text: "The branch address calculator works out branch destinations in the front end. Those addresses help steer instruction fetching toward the next instruction stream.",
      matchedSource: P6_CORE_MAP,
      rect: { x: 15274, y: 7300, width: 1293, height: 1764 },
    },
    {
      id: "page-miss",
      label: "PAGE-MISS HANDLER",
      mapLabel: "PMH",
      text: "When an address translation is missing, the page-miss handler walks the page tables to find it. Missing or disallowed mappings can require a page-fault exception.",
      matchedSource: P6_CORE_MAP,
      rect: { x: 8314, y: 3072, width: 1113, height: 2456 },
    },
    {
      id: "fp-conversion",
      parentId: "floating-point",
      label: "FP CONVERSION",
      text: "The floating-point memory interface converts between memory formats and the floating-point unit's internal format. It sits beside the floating-point execution circuits.",
      matchedSource: P6_CORE_MAP,
      rect: { x: 11395, y: 856, width: 1301, height: 1832 },
    },
    {
      id: "branch-storage",
      parentId: "branch-predictor",
      label: "BRANCH-TARGET STORAGE",
      mapLabel: "BTB STORAGE",
      text: "The branch target buffer stores information about previously encountered branches. Fetch logic uses that information to choose likely destinations before those branches execute.",
      matchedSource: P6_CORE_MAP,
      rect: { x: 19096, y: 11467, width: 2337, height: 991 },
    },
    {
      id: "fp-constants-candidate",
      parentId: "floating-point",
      label: "FP CONSTANT ROM?",
      mapLabel: "FROM?",
      text: "Candidate only: this narrow strip may be the floating-point constant ROM. Such a ROM supplies fixed values for floating-point operations; this identification is unconfirmed.",
      candidate: true,
      matchedSource: P6_CORE_MAP,
      rect: { x: 11395, y: 856, width: 147, height: 1832 },
    },
    {
      id: "entry-pla-candidate",
      parentId: "decoders",
      label: "MICROCODE ENTRY PLA?",
      mapLabel: "ENTRY PLA?",
      text: "Candidate only: this array may select the starting address of a microcode sequence. The reference proposes this role from its position beside the decoder arrays.",
      candidate: true,
      matchedSource: P6_CORE_MAP,
      rect: { x: 19566, y: 3452, width: 729, height: 270 },
    },
    {
      id: "decoder-control-candidate",
      parentId: "decoders",
      label: "DECODER ALIAS CONTROL?",
      mapLabel: "ALIAS?",
      text: "Candidate only: these arrays may hold decoder alias or control information. Decoder aliasing fills instruction-specific fields into micro-operation templates; it differs from register renaming.",
      candidate: true,
      matchedSource: P6_CORE_MAP,
      rect: { x: 20404, y: 3457, width: 935, height: 865 },
    },
    {
      id: "retirement-registers-candidate",
      parentId: "retirement",
      label: "RETIREMENT REGISTERS?",
      mapLabel: "RRF?",
      text: "Candidate only: this small array may hold committed register values. The wider retirement region is mapped, but this particular register-array identification remains unconfirmed.",
      candidate: true,
      matchedSource: P6_CORE_MAP,
      rect: { x: 16711, y: 3227, width: 674, height: 639 },
    },
    {
      id: "reorder-storage-candidate",
      parentId: "retirement",
      label: "REORDER BUFFER ARRAYS?",
      mapLabel: "ROB ARRAYS?",
      text: "Candidate only: these arrays may store reorder-buffer entries. Tracking speculative results is the region's role, but the individual storage arrays are not established here.",
      candidate: true,
      matchedSource: P6_CORE_MAP,
      rect: { x: 16649, y: 841, width: 1268, height: 1687 },
    },
    {
      id: "capacitor-candidate",
      parentId: "scheduler",
      label: "DECOUPLING CAPACITOR?",
      mapLabel: "CAPACITOR?",
      text: "Candidate only: this repeated structure may be a decoupling capacitor bank. If so, it stores charge locally to help steady the power supply as circuits switch.",
      candidate: true,
      matchedSource: P6_CORE_MAP,
      rect: { x: 14182, y: 860, width: 608, height: 3962 },
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
