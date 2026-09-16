// Plans the /quotes layout: rows that fill the full width, where every unit
// in a row is a single card or two short cards stacked on top of each other.
//
// Widths are chosen so all units in a row need the same height at the shared
// font size. That is what lets two short quotes stack beside one tall quote
// instead of sitting in a card that is mostly empty. A dynamic program picks
// the row breaks with the least predicted empty space over the whole list.
// Every row is explicit, so there can be no holes.
//
// Heights come from a text model measured on the page: a serif character at
// text-lg takes about 9.4px of line (wrapping included), a line is 29.25px,
// and card padding plus caption add up to 128px (148px with a two-line or
// portrait caption). The layout width is the desktop column; narrower screens
// scale the same rows, and phones show one card per line.

export type RowItem = { length: number; tallCaption: boolean };

export type Unit = {
  /** Indexes into the item list: one card, or two stacked cards. */
  items: number[];
  /** Flex weight of the unit in its row, the planned width in px. */
  width: number;
  /** Flex weights of the stacked cards, their planned heights in px. */
  heights: number[];
};

export type Row = {
  units: Unit[] /** Planned width left empty, only on the last row. */;
  spare: number;
};

const WIDTH = 1000;
const GAP = 16;
const PAD_X = 56;
const PX_PER_CHAR = 9.4;
const LINE = 29.25;
const MIN_WIDTH = 250;
const MAX_WIDTH = 640;
const TARGET_HEIGHT = 300;
const STACKABLE = 220;
const MAX_ITEMS_PER_ROW = 6;

const chrome = (item: RowItem) => (item.tallCaption ? 148 : 128);

function cardHeight(item: RowItem, width: number) {
  const lines = Math.max(1, Math.ceil((item.length * PX_PER_CHAR) / (width - PAD_X)));
  return chrome(item) + lines * LINE;
}

const unitHeight = (items: RowItem[], width: number) =>
  items.reduce((sum, item) => sum + cardHeight(item, width), 0) + GAP * (items.length - 1);

/** Narrowest width at which the unit fits in `height`, or Infinity if even `maxWidth` is too narrow. */
function widthFor(items: RowItem[], height: number, maxWidth: number) {
  if (unitHeight(items, MIN_WIDTH) <= height) return MIN_WIDTH;
  if (unitHeight(items, maxWidth) > height) return Number.POSITIVE_INFINITY;
  let lo = MIN_WIDTH;
  let hi = maxWidth;
  while (hi - lo > 1) {
    const mid = (lo + hi) / 2;
    if (unitHeight(items, mid) <= height) hi = mid;
    else lo = mid;
  }
  return hi;
}

type Planned = { cost: number; row: Row };

/** Finds the row height at which the units exactly fill the width, and the empty space that leaves. */
function planRow(units: RowItem[][], isLast: boolean): Planned | undefined {
  const available = WIDTH - GAP * (units.length - 1);
  // A card alone in its row may span the full width, as a last resort.
  const maxWidth = units.length === 1 ? WIDTH : MAX_WIDTH;
  const totalWidth = (height: number) =>
    units.reduce((sum, u) => sum + widthFor(u, height, maxWidth), 0);

  let height: number;
  let spare = 0;
  if (isLast && totalWidth(TARGET_HEIGHT) <= available) {
    // The last row may stay short instead of stretching a few cards across.
    height = TARGET_HEIGHT;
    spare = available - totalWidth(height);
  } else {
    let lo = 100;
    let hi = 4000;
    if (totalWidth(hi) > available) return undefined;
    if (totalWidth(lo) <= available) return undefined; // every unit at its minimum and still not full
    while (hi - lo > 1) {
      const mid = (lo + hi) / 2;
      if (totalWidth(mid) <= available) hi = mid;
      else lo = mid;
    }
    height = hi;
  }

  const widths = units.map((u) => widthFor(u, height, maxWidth));
  const scale = spare > 0 ? 1 : available / widths.reduce((a, b) => a + b, 0);
  let waste = 0;
  const planned = units.map((u, i) => {
    const width = widths[i] * scale;
    const heights = u.map((item) => cardHeight(item, width));
    waste += (height - unitHeight(u, width)) * width;
    return { width, heights };
  });

  const stacks = units.filter((u) => u.length > 1).length;
  const alone = units.length === 1 && !isLast ? 200 : 0;
  const cost = waste / 1000 + Math.abs(height - TARGET_HEIGHT) * 0.2 + stacks * 5 + alone;
  return {
    cost,
    row: {
      units: planned.map((p) => ({ items: [], width: p.width, heights: p.heights })),
      spare,
    },
  };
}

/** All ways to cut `count` consecutive items into singles and stacked pairs of short items. */
function groupings(items: RowItem[], start: number, count: number): number[][][] {
  if (count === 0) return [[]];
  const single = groupings(items, start + 1, count - 1).map((rest) => [[start], ...rest]);
  const canStack =
    count >= 2 && items[start].length <= STACKABLE && items[start + 1].length <= STACKABLE;
  const pair = canStack
    ? groupings(items, start + 2, count - 2).map((rest) => [[start, start + 1], ...rest])
    : [];
  return [...single, ...pair];
}

export function planQuoteRows(items: RowItem[]): Row[] {
  const n = items.length;
  const best: (Planned & { next: number })[] = new Array(n + 1);
  best[n] = { cost: 0, next: n, row: { units: [], spare: 0 } };

  for (let start = n - 1; start >= 0; start--) {
    for (let count = 1; count <= Math.min(MAX_ITEMS_PER_ROW, n - start); count++) {
      const end = start + count;
      if (!best[end]) continue;
      for (const grouping of groupings(items, start, count)) {
        if (grouping.length > 4) continue;
        const planned = planRow(
          grouping.map((g) => g.map((i) => items[i])),
          end === n,
        );
        if (!planned) continue;
        const cost = planned.cost + best[end].cost;
        if (!best[start] || cost < best[start].cost) {
          planned.row.units.forEach((unit, i) => {
            unit.items = grouping[i];
          });
          best[start] = { cost, next: end, row: planned.row };
        }
      }
    }
  }

  const rows: Row[] = [];
  for (let i = 0; i < n && best[i]; i = best[i].next) rows.push(best[i].row);
  return rows;
}
