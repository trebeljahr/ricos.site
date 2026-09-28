/*
 * The trail's routes, traced over the page at one reference width each: px
 * from the left edge of the page column (x) and from the top of the wrapper
 * (y). LEFT and RIGHT are the window edges.
 *
 * At any other width the client moves every point with the page:
 *   - x scales with the column, so a point at a quarter of the column stays at
 *     a quarter. Points out in the margins keep their distance in column
 *     widths and just leave the window when the margins are narrow.
 *   - y is held between the two rulers around it. A ruler is the top or bottom
 *     of an element marked `data-trail="name"` ("photos.top", "photos.bottom"),
 *     or of one of that element's children ("photos.grid.2.top"). `rulers`
 *     says where each one was at the reference width; a point halfway between
 *     two rulers there stays halfway between them. "top" is the top of the
 *     wrapper, "end" BELOW px under its bottom.
 * So a trail traced through the gap between two cards stays in that gap
 * however the cards grow.
 *
 * To retrace a stretch: screenshot the page at the reference width, read the
 * points off it, and keep the rulers in step with what the page measures.
 */

export type Point = readonly [x: number, y: number];

export const LEFT = -Infinity;
export const RIGHT = Infinity;

export type Glyph = "range" | "peaks" | "marsh" | "river" | "waves";
export type MarkKind = "compass" | Glyph;

/** A marker stands on the first of its spots that is on screen and clear of the page and the trail. */
export type Mark = { kind: MarkKind; spots: Point[] };

export type Route = {
  /** Width of the page column the route was traced at. */
  column: number;
  rulers: Record<string, number>;
  points: Point[];
  marks: Mark[];
};

const LOOP = [
  [0.9, -0.8],
  [0.7, 0.6],
  [0, 1],
  [-0.8, 0.5],
  [-0.9, -0.4],
  [-0.3, -1],
  [0.5, -0.8],
  [1.1, -0.1],
  [1.6, 0.8],
] as const;

/**
 * A loop like the one beside the subtitle: down one side, round underneath
 * and over the top, and out downwards across its own track, to the right
 * (side 1) or to the left (side -1). The way in is up to the route, so it can
 * bend in gently.
 */
const loop = (cx: number, cy: number, r: number, side: 1 | -1): Point[] =>
  LOOP.map(([x, y]) => [cx + side * x * r, cy + y * r]);

/**
 * The same loop turned a quarter, for a trail that crosses the page: in low,
 * up and back over the top, and out downwards across its own track, heading
 * right (side 1) or left (side -1).
 */
const curl = (cx: number, cy: number, r: number, side: 1 | -1): Point[] =>
  LOOP.map(([x, y]) => [cx + side * y * r, cy + x * r]);

// Desktop (md+), traced at a 1449px window. In low from the left, up the
// margin with a small loop beside the photo, over the title with a dip beside
// it, a loop by the subtitle, a hairpin, then once round the intro text and up
// the right margin. From there down the page: under the photo grid (it shows
// in the gaps), past the gallery link, a loop by each heading that has room,
// under the cards, the links and the form, and out at the bottom right.
export const WIDE_ROUTE: Route = {
  column: 1000,
  rulers: {
    top: 0,
    "photo.top": 216,
    "text.top": 372,
    "text.bottom": 536,
    "photo.bottom": 692,
    "photos.top": 772,
    "photos.head.bottom": 884,
    "photos.grid.1.bottom": 1157,
    "photos.grid.3.top": 1169,
    "photos.grid.0.bottom": 1410,
    "photos.bottom": 1471,
    "scenes.top": 1551,
    "scenes.head.bottom": 1663,
    "scenes.cards.0.bottom": 2112,
    "scenes.bottom": 2172,
    "holes.top": 2252,
    "holes.head.bottom": 2364,
    "holes.bottom": 2855,
    "touch.top": 2935,
    "touch.head.bottom": 3047,
    "touch.bottom": 3511,
    end: 3591,
  },
  points: [
    [LEFT, 644],
    [-188, 629],
    [-152, 598],
    [-132, 550],
    [-116, 500],
    [-105, 452],
    [-106, 415],
    [-121, 390],
    [-142, 367],
    [-155, 342],
    [-152, 315],
    [-132, 293],
    [-103, 281],
    [-74, 279],
    [-56, 287],
    [-57, 300],
    [-74, 308],
    [-95, 302],
    [-109, 275],
    [-115, 226],
    [-117, 170],
    [-111, 123],
    [-88, 92],
    [-40, 76],
    [30, 65],
    [109, 56],
    [184, 50],
    [250, 54],
    [300, 62],
    [340, 78],
    [378, 100],
    [412, 112],
    [448, 108],
    [482, 92],
    [515, 72],
    [555, 56],
    [605, 48],
    [633, 49],
    [659, 60],
    [679, 80],
    [690, 106],
    [691, 134],
    [681, 161],
    [648, 212],
    [608, 231],
    [571, 227],
    [552, 206],
    [558, 179],
    [588, 162],
    [631, 166],
    [682, 190],
    [739, 222],
    // The hairpin, then left over the text, round behind the photo and back out
    // under the text.
    [800, 231],
    [850, 234],
    [885, 234],
    [907, 238],
    [926, 251],
    [939, 270],
    [943, 292],
    [939, 314],
    [926, 333],
    [907, 346],
    [885, 350],
    [800, 351],
    [720, 352],
    [640, 352],
    [545, 353],
    [478, 355],
    [400, 358],
    [330, 378],
    [288, 425],
    [274, 490],
    [290, 552],
    [335, 590],
    [405, 604],
    [485, 608],
    [570, 609],
    [680, 607],
    [800, 604],
    [910, 596],
    [985, 578],
    [1030, 545],
    [1050, 490],
    [1060, 432],
    [1070, 406],
    [1089, 386],
    [1114, 374],
    [1141, 372],
    [1168, 381],
    [1189, 399],
    [1202, 423],
    [1205, 451],
    [1190, 580],
    [1168, 660],
    [1120, 715],
    [1050, 745],
    [970, 760],
    // Photography: beside the heading, under the grid, past the gallery link.
    [890, 777],
    [838, 800],
    [808, 833],
    [800, 872],
    [810, 912],
    [824, 950],
    [805, 1030],
    [772, 1110],
    [753, 1163],
    [715, 1225],
    [640, 1290],
    [560, 1335],
    [500, 1360],
    [430, 1393],
    [408, 1409],
    [394, 1432],
    [390, 1458],
    [395, 1484],
    [411, 1507],
    [433, 1521],
    [460, 1526],
    [600, 1522],
    [700, 1518],
    [780, 1520],
    [830, 1528],
    [858, 1545],
    ...loop(830, 1605, 40, 1),
    [912, 1680],
    [916, 1722],
    [898, 1770],
    [850, 1818],
    [770, 1860],
    [660, 1900],
    [560, 1925],
    [500, 1938],
    [430, 1990],
    [375, 2055],
    [340, 2110],
    [330, 2137],
    [332, 2165],
    [344, 2190],
    [366, 2209],
    [393, 2217],
    [500, 2226],
    [620, 2230],
    [740, 2240],
    [820, 2262],
    [862, 2300],
    [870, 2345],
    [852, 2395],
    [800, 2470],
    [730, 2540],
    [670, 2580],
    [560, 2620],
    [420, 2650],
    [329, 2672],
    [230, 2720],
    [160, 2785],
    [144, 2807],
    [138, 2834],
    [142, 2861],
    [157, 2884],
    [179, 2900],
    [205, 2906],
    [320, 2913],
    [450, 2915],
    [585, 2916],
    [606, 2920],
    [624, 2931],
    [638, 2947],
    // Stay in touch: a loop beside the heading, under the form and out along
    // the bottom of the page.
    ...loop(680, 3000, 40, -1),
    [585, 3075],
    [520, 3150],
    [430, 3250],
    [345, 3350],
    [290, 3450],
    [282, 3475],
    [283, 3502],
    [295, 3525],
    [314, 3543],
    [339, 3553],
    [500, 3574],
    [650, 3574],
    [800, 3570],
    [940, 3562],
    [1060, 3545],
    [RIGHT, 3525],
  ],
  // High ground along the top, where the trail runs over the title; marsh,
  // rivers and sea further down and out in the margins, which only wide
  // windows have room for.
  marks: [
    {
      kind: "compass",
      // Set in from the corner so it reads as drawn on the map, not pinned to
      // the window; the old corner spot stays as a fallback.
      spots: [
        [1050, 95],
        [1140, 30],
        [900, 76],
      ],
    },
    { kind: "range", spots: [[300, 22]] },
    { kind: "peaks", spots: [[530, 17]] },
    { kind: "range", spots: [[-151, 34]] },
    { kind: "peaks", spots: [[412, 78]] },
    { kind: "peaks", spots: [[610, 194]] },
    { kind: "peaks", spots: [[-55, 177]] },
    { kind: "marsh", spots: [[700, 570]] },
    { kind: "waves", spots: [[-190, 478]] },
    { kind: "waves", spots: [[-320, 335]] },
    { kind: "river", spots: [[-300, 559]] },
    { kind: "marsh", spots: [[-60, 621]] },
    { kind: "range", spots: [[620, 815]] },
    { kind: "river", spots: [[1110, 1000]] },
    { kind: "waves", spots: [[1120, 1250]] },
    { kind: "marsh", spots: [[1090, 1420]] },
    { kind: "waves", spots: [[-130, 1050]] },
    { kind: "peaks", spots: [[-120, 1250]] },
    { kind: "peaks", spots: [[830, 1601]] },
    { kind: "range", spots: [[1100, 1750]] },
    { kind: "river", spots: [[1110, 1950]] },
    { kind: "waves", spots: [[1130, 2120]] },
    { kind: "marsh", spots: [[-120, 1780]] },
    { kind: "waves", spots: [[-150, 1980]] },
    { kind: "marsh", spots: [[760, 2300]] },
    { kind: "peaks", spots: [[-120, 2450]] },
    { kind: "river", spots: [[-110, 2650]] },
    { kind: "waves", spots: [[1100, 2500]] },
    { kind: "marsh", spots: [[1090, 2720]] },
    { kind: "peaks", spots: [[680, 2997]] },
    { kind: "range", spots: [[1100, 3100]] },
    { kind: "waves", spots: [[1120, 3350]] },
    { kind: "marsh", spots: [[-100, 3150]] },
    { kind: "waves", spots: [[-130, 3400]] },
    { kind: "marsh", spots: [[300, 3550]] },
  ],
};

// Mobile, traced at 375px. One column with no margins, so the trail runs
// under the photos and cards and shows in the space between them: in low from
// the left, over the title, a loop by the subtitle and under the portrait.
// Down the page, every wide gap between two sections gets a loop or a curl
// round a peak, with sea, a river or marsh beside it. Between the gaps the
// trail runs down the free right edge beside the headings, down the street
// between the small photos, and under the cards, peeking out between them.
// It leaves along the bottom after a last loop by the links.
export const NARROW_ROUTE: Route = {
  column: 351,
  rulers: {
    top: 0,
    "photo.top": 228,
    "photo.bottom": 491,
    "text.top": 523,
    "text.bottom": 743,
    "photos.top": 823,
    "photos.head.bottom": 959,
    "photos.grid.top": 991,
    "photos.grid.0.bottom": 1254,
    "photos.grid.1.top": 1266,
    "photos.grid.1.bottom": 1436,
    "photos.grid.3.top": 1448,
    "photos.grid.bottom": 1617,
    "photos.2.top": 1641,
    "photos.bottom": 1670,
    "scenes.top": 1750,
    "scenes.head.bottom": 1950,
    "scenes.cards.top": 1982,
    "scenes.cards.0.bottom": 2328,
    "scenes.cards.1.top": 2352,
    "scenes.cards.bottom": 2672,
    "scenes.2.top": 2696,
    "scenes.bottom": 2725,
    "holes.top": 2805,
    "holes.head.bottom": 2977,
    "holes.cards.top": 3009,
    "holes.cards.0.bottom": 3416,
    "holes.cards.1.top": 3440,
    "holes.cards.1.bottom": 3847,
    "holes.cards.2.top": 3871,
    "holes.bottom": 4304,
    "touch.top": 4384,
    "touch.head.bottom": 4492,
    "touch.grid.top": 4524,
    "touch.grid.0.bottom": 4986,
    "touch.grid.1.top": 5026,
    "touch.bottom": 5349,
    end: 5429,
  },
  points: [
    [LEFT, 68],
    [35, 66],
    [105, 62],
    [176, 66],
    [231, 82],
    [260, 112],
    [266, 149],
    [256, 185],
    [230, 213],
    [192, 220],
    [165, 205],
    [170, 181],
    [200, 169],
    [239, 174],
    [281, 192],
    [316, 210],
    // Under the portrait, out at its bottom left corner.
    [340, 245],
    [320, 330],
    [200, 420],
    [60, 478],
    [10, 505],
    [LEFT, 520],
    // Photography: a curl round a peak under the intro, down beside the
    // heading, under the big photo and down the street between the small ones.
    [LEFT, 762],
    [20, 779],
    [60, 800],
    [92, 811],
    ...curl(140, 783, 33, 1),
    [215, 846],
    [275, 849],
    [315, 862],
    [330, 885],
    [333, 915],
    [325, 950],
    [305, 980],
    [250, 1080],
    [200, 1170],
    [180, 1230],
    [176, 1290],
    [176, 1400],
    [176, 1520],
    [177, 1600],
    [184, 1625],
    [205, 1640],
    [230, 1652],
    [250, 1668],
    // 3D: a wide loop round a range, down the right edge beside the heading,
    // and under the cards, out between them on the left.
    ...loop(226, 1722, 44, 1),
    [318, 1785],
    [322, 1800],
    [328, 1835],
    [330, 1870],
    [332, 1920],
    [325, 1965],
    [300, 2040],
    [200, 2180],
    [100, 2290],
    [65, 2340],
    [80, 2420],
    [180, 2530],
    [280, 2640],
    // Rabbit holes: out past the end of the link, a loop round a peak, down
    // the right edge and under the cards, out between them on either side.
    [300, 2685],
    [292, 2708],
    [277, 2722],
    ...loop(228, 2769, 36, 1),
    [312, 2824],
    [332, 2850],
    [338, 2890],
    [342, 2935],
    [335, 2985],
    [300, 3060],
    [180, 3200],
    [80, 3330],
    [55, 3428],
    [75, 3520],
    [190, 3650],
    [280, 3790],
    [295, 3859],
    [270, 3960],
    [190, 4100],
    [120, 4230],
    // Stay in touch: out from under the last card, a curl round a peak, off to
    // the right and under the form.
    [95, 4305],
    [115, 4332],
    [140, 4362],
    ...curl(195, 4346, 33, 1),
    [265, 4408],
    [315, 4410],
    [RIGHT, 4410],
    [RIGHT, 4800],
    [330, 4900],
    [306, 4975],
    [297, 4995],
    // A loop round a peak by the links, down past them and out along the
    // bottom.
    ...loop(262, 5040, 36, 1),
    [335, 5100],
    [342, 5160],
    [340, 5230],
    [346, 5290],
    [350, 5330],
    [338, 5372],
    [285, 5402],
    [185, 5415],
    [85, 5413],
    [20, 5405],
    [LEFT, 5400],
  ],
  // A peak or a range inside every loop, as on the wide map, and sea, a river
  // and marsh in the open gaps beside them.
  marks: [
    {
      kind: "compass",
      spots: [
        [285, 60],
        [302, 46],
      ],
    },
    { kind: "range", spots: [[193, 32]] },
    { kind: "peaks", spots: [[211, 196]] },
    { kind: "peaks", spots: [[140, 782]] },
    { kind: "waves", spots: [[270, 785]] },
    { kind: "range", spots: [[226, 1722]] },
    { kind: "river", spots: [[105, 1715]] },
    { kind: "peaks", spots: [[228, 2769]] },
    { kind: "marsh", spots: [[95, 2767]] },
    { kind: "peaks", spots: [[195, 4346]] },
    { kind: "waves", spots: [[295, 4345]] },
    { kind: "peaks", spots: [[262, 5040]] },
    { kind: "range", spots: [[100, 5380]] },
  ],
};
