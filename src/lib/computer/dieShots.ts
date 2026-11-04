// Die photos for the DieZoom demo, and the math to show them: which tiles a
// view needs, how big a coin is next to the die, and what a scale bar says.
// Tiles come from src/scripts/computer/makeDieTiles.ts.

export type Rect = { x: number; y: number; width: number; height: number };

export type DieSpot = {
  id: string;
  /** A closer view inside another spot. */
  parentId?: string;
  /** Its one name, at every zoom: "L2 CACHE". A soft hyphen marks where a long word may break. */
  label: string;
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
  core: { x: 8304, y: 828, width: 13067, height: 11632 },
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
      rect: { x: 108, y: 642, width: 7492, height: 12076 },
    },
    {
      id: "l1-data",
      label: "L1 DATA CACHE",
      matchedSource: P6_CORE_MAP,
      rect: { x: 13676, y: 9062, width: 2874, height: 3388 },
      outline: [
        [13712, 9090],
        [14428, 9090],
        [14428, 9068],
        [15678, 9068],
        [15678, 9066],
        [16390, 9066],
        [16390, 9062],
        [16550, 9062],
        [16550, 10586],
        [16546, 10586],
        [16546, 12258],
        [16530, 12258],
        [16530, 12450],
        [13676, 12450],
        [13676, 11648],
        [13690, 11648],
        [13690, 9920],
        [13712, 9920],
      ],
    },
    {
      id: "l1-instructions",
      label: "L1 INSTRUCTION CACHE",
      matchedSource: P6_CORE_MAP,
      rect: { x: 18810, y: 6972, width: 2546, height: 4172 },
      outline: [
        [18814, 6972],
        [21196, 6972],
        [21196, 7026],
        [21336, 7026],
        [21336, 8538],
        [21356, 8538],
        [21356, 11144],
        [18814, 11144],
        [18814, 11138],
        [18810, 11138],
        [18810, 10522],
        [18814, 10522],
      ],
    },
    {
      id: "microcode",
      label: "MICROCODE ROM",
      matchedSource: P6_CORE_MAP,
      rect: { x: 18908, y: 828, width: 2442, height: 1632 },
      outline: [
        [21344, 828],
        [21344, 846],
        [21350, 846],
        [21350, 1184],
        [21344, 1184],
        [21344, 2460],
        [18994, 2460],
        [18994, 2260],
        [19004, 2260],
        [19004, 1972],
        [18988, 1972],
        [18988, 1658],
        [18908, 1658],
        [18908, 828],
      ],
    },
    {
      id: "floating-point",
      label: "FLOATING POINT",
      matchedSource: P6_CORE_MAP,
      rect: { x: 8304, y: 858, width: 4400, height: 1856 },
      outline: [
        [8308, 858],
        [8308, 862],
        [8890, 862],
        [8890, 858],
        [12704, 858],
        [12704, 2664],
        [12686, 2664],
        [12686, 2686],
        [12560, 2686],
        [12560, 2696],
        [12274, 2696],
        [12274, 2674],
        [12114, 2674],
        [12114, 2690],
        [11542, 2690],
        [11542, 2708],
        [11520, 2708],
        [11520, 2714],
        [11280, 2714],
        [11280, 2662],
        [11282, 2662],
        [11282, 2658],
        [10512, 2658],
        [10512, 2674],
        [10214, 2674],
        [10214, 2658],
        [9620, 2658],
        [9620, 2686],
        [9408, 2686],
        [9408, 2566],
        [9400, 2566],
        [9400, 2565],
        [8318, 2565],
        [8318, 2570],
        [8308, 2570],
        [8308, 1518],
        [8304, 1518],
        [8304, 858],
      ],
    },
    {
      id: "integer",
      label: "INTEGER ARITHMETIC",
      matchedSource: P6_CORE_MAP,
      rect: { x: 9406, y: 2658, width: 3316, height: 2478 },
      outline: [
        [9406, 2686],
        [9622, 2686],
        [9622, 2658],
        [10214, 2658],
        [10214, 2674],
        [10518, 2674],
        [10518, 2658],
        [11278, 2658],
        [11278, 2714],
        [11530, 2714],
        [11530, 2708],
        [11544, 2708],
        [11544, 2690],
        [12114, 2690],
        [12114, 2674],
        [12274, 2674],
        [12274, 2696],
        [12566, 2696],
        [12566, 2686],
        [12698, 2686],
        [12698, 2668],
        [12722, 2668],
        [12722, 5010],
        [11140, 5010],
        [11140, 5136],
        [9428, 5136],
        [9428, 3090],
        [9406, 3090],
      ],
    },
    {
      id: "mmx",
      label: "MMX",
      matchedSource: P6_CORE_MAP,
      rect: { x: 12722, y: 828, width: 1448, height: 4220 },
      outline: [
        [12722, 5048],
        [12722, 828],
        [14170, 828],
        [14170, 4820],
        [14108, 4820],
        [14108, 5048],
      ],
    },
    {
      id: "scheduler",
      label: "SCHEDULER",
      matchedSource: P6_CORE_MAP,
      rect: { x: 14796, y: 846, width: 1850, height: 4136 },
      outline: [
        [14800, 846],
        [16646, 846],
        [16646, 4978],
        [16000, 4978],
        [16000, 4982],
        [14804, 4982],
        [14804, 4968],
        [14820, 4968],
        [14820, 4756],
        [14796, 4756],
        [14796, 2878],
        [14868, 2878],
        [14868, 2782],
        [14890, 2782],
        [14890, 2566],
        [14924, 2566],
        [14924, 2374],
        [14920, 2374],
        [14920, 1204],
        [14922, 1204],
        [14922, 902],
        [14800, 902],
      ],
    },
    {
      id: "branch-predictor",
      label: "BRANCH PREDICTION",
      matchedSource: P6_CORE_MAP,
      rect: { x: 17282, y: 11146, width: 4089, height: 1308 },
      outline: [
        [17378, 11146],
        [21371, 11146],
        [21371, 12436],
        [21272, 12436],
        [21272, 12454],
        [17282, 12454],
        [17282, 11534],
        [17378, 11534],
      ],
      labelRect: { x: 17385, y: 11150, width: 3980, height: 1280 },
    },
    {
      id: "decoders",
      label: "X86 DECODERS",
      rect: { x: 16542, y: 2440, width: 4810, height: 3866 },
      outline: [
        [18988, 2440],
        [18988, 2474],
        [21172, 2474],
        [21172, 2460],
        [21344, 2460],
        [21344, 2458],
        [21348, 2458],
        [21348, 5050],
        [21352, 5050],
        [21352, 6200],
        [19250, 6200],
        [19250, 6296],
        [18408, 6296],
        [18408, 6306],
        [16884, 6306],
        [16884, 6212],
        [16736, 6212],
        [16736, 6220],
        [16552, 6220],
        [16552, 5252],
        [16542, 5252],
        [16542, 4984],
        [16640, 4984],
        [16640, 4978],
        [16646, 4978],
        [16646, 3896],
        [17468, 3896],
        [17468, 3876],
        [17470, 3876],
        [17470, 3670],
        [18924, 3670],
        [18924, 2638],
        [18898, 2638],
        [18898, 2600],
        [18922, 2600],
        [18922, 2440],
      ],
      labelRect: { x: 18940, y: 2480, width: 2400, height: 1180 },
    },
    {
      id: "full-decoder",
      parentId: "decoders",
      label: "FULL DECODER",
      rect: { x: 19522, y: 3722, width: 792, height: 1656 },
    },
    {
      id: "simple-decoder-1",
      parentId: "decoders",
      label: "SIMPLE DECODER 1",
      rect: { x: 18412, y: 3850, width: 400, height: 404 },
    },
    {
      id: "simple-decoder-2",
      parentId: "decoders",
      label: "SIMPLE DECODER 2",
      rect: { x: 18407, y: 4982, width: 401, height: 422 },
      outline: [
        [18407, 5008],
        [18780, 5008],
        [18780, 4982],
        [18808, 4982],
        [18808, 5404],
        [18407, 5404],
      ],
    },
    {
      id: "fetch",
      label: "INSTRUCTION FETCH",
      matchedSource: P6_CORE_MAP,
      rect: { x: 16546, y: 6208, width: 2268, height: 6242 },
      outline: [
        [16552, 6208],
        [16552, 6220],
        [16736, 6220],
        [16736, 6212],
        [16884, 6212],
        [16884, 6306],
        [18790, 6306],
        [18790, 7186],
        [18814, 7186],
        [18814, 10406],
        [18810, 10406],
        [18810, 11086],
        [17440, 11086],
        [17440, 11138],
        [17372, 11138],
        [17372, 11534],
        [17282, 11534],
        [17282, 12450],
        [16690, 12450],
        [16690, 12262],
        [16688, 12262],
        [16688, 12258],
        [16546, 12258],
        [16546, 10586],
        [16550, 10586],
        [16550, 9120],
        [16560, 9120],
        [16560, 7600],
        [16570, 7600],
        [16570, 7300],
        [16548, 7300],
        [16548, 6208],
      ],
    },
    {
      id: "instruction-buffer",
      parentId: "fetch",
      label: "INSTRUCTION BUFFER",
      matchedSource: P6_CORE_MAP,
      rect: { x: 16873, y: 6380, width: 1752, height: 1960 },
      outline: [
        [16873, 6380],
        [18625, 6380],
        [18625, 8340],
        [17190, 8340],
        [17190, 7640],
        [16873, 7640],
      ],
    },
    {
      id: "rename",
      label: "REGISTER RENAMING",
      matchedSource: P6_CORE_MAP,
      rect: { x: 12630, y: 4980, width: 3918, height: 2340 },
      outline: [
        [14118, 5060],
        [14118, 4990],
        [14534, 4990],
        [14534, 4982],
        [16186, 4982],
        [16186, 4980],
        [16548, 4980],
        [16548, 4984],
        [16542, 4984],
        [16542, 5252],
        [16548, 5252],
        [16548, 7296],
        [15960, 7296],
        [15960, 7300],
        [15272, 7300],
        [15272, 7304],
        [15268, 7304],
        [15268, 7300],
        [14814, 7300],
        [14814, 7294],
        [14424, 7294],
        [14424, 7312],
        [14242, 7312],
        [14242, 7318],
        [14124, 7318],
        [14124, 7320],
        [12702, 7320],
        [12702, 7302],
        [12668, 7302],
        [12668, 7160],
        [12712, 7160],
        [12712, 6702],
        [12708, 6702],
        [12708, 5812],
        [12810, 5812],
        [12810, 5324],
        [12636, 5324],
        [12636, 5236],
        [12630, 5236],
        [12630, 5060],
      ],
      labelRect: { x: 12720, y: 5070, width: 3800, height: 2200 },
    },
    {
      id: "retirement",
      label: "REORDER / RETIREMENT",
      matchedSource: P6_CORE_MAP,
      rect: { x: 16646, y: 846, width: 2352, height: 3030 },
      outline: [
        [16646, 3876],
        [16646, 846],
        [18908, 846],
        [18908, 1676],
        [18988, 1676],
        [18988, 1972],
        [18998, 1972],
        [18998, 2190],
        [18922, 2190],
        [18922, 2600],
        [18898, 2600],
        [18898, 2642],
        [18924, 2642],
        [18924, 3650],
        [17470, 3650],
        [17470, 3876],
      ],
    },
    {
      id: "memory-order",
      label: "MEMORY ORDERING",
      matchedSource: P6_CORE_MAP,
      rect: { x: 9692, y: 5050, width: 3118, height: 2672 },
      outline: [
        [11144, 5164],
        [11144, 5050],
        [12628, 5050],
        [12628, 5236],
        [12636, 5236],
        [12636, 5324],
        [12810, 5324],
        [12810, 5812],
        [12708, 5812],
        [12708, 6788],
        [12712, 6788],
        [12712, 7160],
        [12668, 7160],
        [12668, 7302],
        [12702, 7302],
        [12702, 7686],
        [12164, 7686],
        [12164, 7672],
        [10778, 7672],
        [10778, 7722],
        [10482, 7722],
        [10482, 7688],
        [10252, 7688],
        [10252, 7592],
        [9692, 7592],
        [9692, 7184],
        [9776, 7184],
        [9776, 5164],
      ],
      labelRect: { x: 9800, y: 5175, width: 2830, height: 2490 },
    },
    {
      id: "dtlb",
      label: "ADDRESS TRANSLATION",
      matchedSource: P6_CORE_MAP,
      rect: { x: 11112, y: 9584, width: 2572, height: 2872 },
      outline: [
        [11180, 10886],
        [11180, 9596],
        [12362, 9596],
        [12362, 9584],
        [13554, 9584],
        [13554, 9934],
        [13684, 9934],
        [13684, 11648],
        [13670, 11648],
        [13670, 12456],
        [11180, 12456],
        [11180, 11618],
        [11112, 11618],
        [11112, 10886],
      ],
      labelRect: { x: 11190, y: 9600, width: 2360, height: 2850 },
    },
    {
      id: "dtlb-storage",
      parentId: "dtlb",
      label: "TRANSLATION STORAGE",
      matchedSource: P6_CORE_MAP,
      rect: { x: 12712, y: 11366, width: 956, height: 1084 },
    },
    {
      id: "allocate",
      label: "ALLOC\u00ADATION",
      matchedSource: P6_CORE_MAP,
      rect: { x: 14438, y: 7294, width: 880, height: 1772 },
      outline: [
        [14438, 9066],
        [14438, 7294],
        [14814, 7294],
        [14814, 7300],
        [15268, 7300],
        [15268, 8048],
        [15276, 8048],
        [15276, 9036],
        [15318, 9036],
        [15318, 9066],
      ],
    },
    {
      id: "bus-interface",
      label: "BUS INTERFACE",
      matchedSource: P6_CORE_MAP,
      rect: { x: 8308, y: 5466, width: 6110, height: 6994 },
      outline: [
        [9292, 5530],
        [9292, 5500],
        [9772, 5500],
        [9772, 5466],
        [9776, 5466],
        [9776, 7184],
        [9692, 7184],
        [9692, 7592],
        [10252, 7592],
        [10252, 7688],
        [10482, 7688],
        [10482, 7722],
        [10778, 7722],
        [10778, 7678],
        [12164, 7678],
        [12164, 7686],
        [12702, 7686],
        [12702, 7326],
        [13764, 7326],
        [13764, 7320],
        [14204, 7320],
        [14204, 7318],
        [14242, 7318],
        [14242, 7312],
        [14418, 7312],
        [14418, 9090],
        [13696, 9090],
        [13696, 9584],
        [12362, 9584],
        [12362, 9596],
        [11180, 9596],
        [11180, 9600],
        [11162, 9600],
        [11162, 10640],
        [11112, 10640],
        [11112, 11618],
        [11042, 11618],
        [11042, 11922],
        [11052, 11922],
        [11052, 12034],
        [11042, 12034],
        [11042, 12456],
        [11162, 12456],
        [11162, 12460],
        [8328, 12460],
        [8328, 12304],
        [8342, 12304],
        [8342, 11718],
        [8350, 11718],
        [8350, 11482],
        [8340, 11482],
        [8340, 10692],
        [8352, 10692],
        [8352, 10522],
        [8332, 10522],
        [8332, 9840],
        [8330, 9840],
        [8330, 8936],
        [8322, 8936],
        [8322, 8570],
        [8314, 8570],
        [8314, 8508],
        [8322, 8508],
        [8322, 7936],
        [8308, 7936],
        [8308, 7256],
        [8324, 7256],
        [8324, 5530],
      ],
    },
    {
      id: "branch-address",
      label: "BRANCH ADDRESS",
      matchedSource: P6_CORE_MAP,
      rect: { x: 15272, y: 7296, width: 1298, height: 1770 },
      outline: [
        [15960, 7296],
        [16540, 7296],
        [16540, 7300],
        [16570, 7300],
        [16570, 7600],
        [16560, 7600],
        [16560, 9058],
        [16390, 9058],
        [16390, 9066],
        [15318, 9066],
        [15318, 9036],
        [15276, 9036],
        [15276, 8048],
        [15272, 8048],
        [15272, 7300],
        [15960, 7300],
      ],
    },
    {
      id: "page-miss",
      label: "PAGE-MISS HANDLER",
      matchedSource: P6_CORE_MAP,
      rect: { x: 8318, y: 2565, width: 1454, height: 2935 },
      outline: [
        [8318, 2565],
        [9400, 2565],
        [9400, 3090],
        [9424, 3090],
        [9424, 5147],
        [9772, 5147],
        [9772, 5500],
        [8318, 5500],
      ],
    },
    {
      id: "fp-conversion",
      parentId: "floating-point",
      label: "FP CONVERSION",
      matchedSource: P6_CORE_MAP,
      rect: { x: 11543, y: 860, width: 1145, height: 1834 },
      outline: [
        [11543, 860],
        [12688, 860],
        [12688, 2662],
        [12684, 2662],
        [12684, 2684],
        [12560, 2684],
        [12560, 2694],
        [12274, 2694],
        [12274, 2672],
        [12114, 2672],
        [12114, 2688],
        [11543, 2688],
      ],
    },
    {
      id: "branch-storage",
      parentId: "branch-predictor",
      label: "BRANCH-TARGET STORAGE",
      matchedSource: P6_CORE_MAP,
      rect: { x: 19096, y: 11410, width: 2271, height: 1040 },
      outline: [
        [19096, 11464],
        [19800, 11464],
        [19800, 11422],
        [20606, 11422],
        [20606, 11410],
        [20706, 11410],
        [20706, 11432],
        [20908, 11432],
        [20908, 11438],
        [21367, 11438],
        [21367, 12432],
        [21268, 12432],
        [21268, 12450],
        [19096, 12450],
      ],
    },
    {
      id: "fp-constants-candidate",
      parentId: "floating-point",
      label: "FP CONSTANT ROM?",
      candidate: true,
      matchedSource: P6_CORE_MAP,
      rect: { x: 11398, y: 862, width: 143, height: 1335 },
    },
    {
      id: "entry-pla-candidate",
      parentId: "decoders",
      label: "MICROCODE ENTRY PLA?",
      candidate: true,
      matchedSource: P6_CORE_MAP,
      rect: { x: 19560, y: 3490, width: 724, height: 228 },
    },
    {
      id: "decoder-control-candidate",
      parentId: "decoders",
      label: "DECODER ALIAS CONTROL?",
      candidate: true,
      matchedSource: P6_CORE_MAP,
      rect: { x: 20340, y: 3455, width: 1000, height: 864 },
      outline: [
        [20389, 3455],
        [21340, 3455],
        [21340, 4319],
        [20340, 4319],
        [20340, 4045],
        [20389, 4045],
      ],
    },
    {
      id: "retirement-registers-candidate",
      parentId: "retirement",
      label: "RETIREMENT REGISTERS?",
      candidate: true,
      matchedSource: P6_CORE_MAP,
      rect: { x: 16712, y: 3224, width: 718, height: 650 },
      outline: [
        [16712, 3224],
        [17320, 3224],
        [17320, 3274],
        [17384, 3274],
        [17384, 3614],
        [17430, 3614],
        [17430, 3874],
        [16712, 3874],
      ],
    },
    {
      id: "reorder-storage-candidate",
      parentId: "retirement",
      label: "REORDER BUFFER ARRAYS?",
      candidate: true,
      matchedSource: P6_CORE_MAP,
      rect: { x: 16648, y: 850, width: 1360, height: 1886 },
      outline: [
        [16648, 850],
        [17922, 850],
        [17922, 1744],
        [17912, 1744],
        [17912, 2062],
        [18008, 2062],
        [18008, 2588],
        [17470, 2588],
        [17470, 2736],
        [16648, 2736],
      ],
    },
    {
      id: "capacitor-candidate",
      parentId: "scheduler",
      label: "DECOUPLING CAPACITOR?",
      candidate: true,
      matchedSource: P6_CORE_MAP,
      rect: { x: 14174, y: 848, width: 628, height: 3974 },
      outline: [
        [14790, 848],
        [14790, 860],
        [14782, 860],
        [14782, 2392],
        [14788, 2392],
        [14788, 3392],
        [14796, 3392],
        [14796, 4560],
        [14802, 4560],
        [14802, 4822],
        [14174, 4822],
        [14174, 848],
      ],
    },
    {
      id: "alignment",
      label: "ALIGNMENT MARK",
      labelOutside: true,
      rect: { x: 16530, y: 12258, width: 158, height: 182 },
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
export const LABEL_LINE_PIXELS = 14;
export const LABEL_HEIGHT_PIXELS = LABEL_LINE_PIXELS + 4;

const SOFT_HYPHEN = "\u00AD";

/** A region's name as text, without its break hints. */
export const plainLabel = (label: string) => label.replaceAll(SOFT_HYPHEN, "");

const textWidth = (text: string) => text.length * LABEL_CHAR_PIXELS + LABEL_PADDING_PIXELS;

/** The pieces a name may break into. A piece that breaks at a soft hyphen shows the hyphen. */
function labelPieces(label: string) {
  return label.split(" ").flatMap((word) => {
    const parts = word.split(SOFT_HYPHEN);
    return parts.map((part, index) => ({ text: part, hyphen: index < parts.length - 1 }));
  });
}

/** A name set in lines that fit `available` pixels, or in its narrowest lines if none do. */
export function labelLayout(label: string, available: number) {
  const lines: string[] = [];
  let line = "";
  let joinWithSpace = false;
  let pendingHyphen = false;
  for (const { text, hyphen } of labelPieces(label)) {
    const joined = line + (joinWithSpace ? " " : "") + text;
    if (line && textWidth(joined + (hyphen ? "-" : "")) > available) {
      lines.push(pendingHyphen ? `${line}-` : line);
      line = text;
    } else {
      line = joined;
    }
    joinWithSpace = !hyphen;
    pendingHyphen = hyphen;
  }
  lines.push(line);
  return {
    text: lines.join("\n"),
    width: Math.max(...lines.map(textWidth)),
    height: LABEL_HEIGHT_PIXELS + (lines.length - 1) * LABEL_LINE_PIXELS,
  };
}

/** The zoom at which a spot's name fits inside its box, in its narrowest lines. */
export function labelFitScale(spot: DieSpot) {
  const box = spot.labelRect ?? spot.rect;
  const { width, height } = labelLayout(spot.label, 0);
  return Math.max((width + 6) / box.width, (height + 6) / box.height);
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
