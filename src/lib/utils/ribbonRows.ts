/**
 * Where the spectrum ribbon's rows break, and how much each row is stretched
 * or squeezed to end flush with both edges.
 *
 * The ribbon keeps every tile the same height, so the only thing a row can
 * give to close up is width: each tile is cropped a little wider or narrower
 * than its photograph by `object-cover`. Plain `flex-wrap` only ever stretches
 * — it breaks a row at the first tile that does not fit and grows the rest —
 * and a wide frame arriving at the end of a row leaves nearly its whole width
 * to be made up. Capping the stretch to keep that crop sane is what left holes
 * down the right edge of the ribbon: a row that needed more than the cap came
 * up short and stayed short.
 *
 * So each row also considers the other option, taking the tile that did not
 * fit and squeezing everything to make room, and keeps whichever crops less.
 * That bounds the distortion both ways without a cap, so every row closes: at
 * the 180px desktop row no tile is ever more than a quarter off its own shape,
 * and on a phone, where one panorama is two thirds of a row, under half.
 *
 * Deliberately one tile of lookahead and no more. An optimal fit over the
 * whole window (Knuth-Plass, as justified text does it) would crop a little
 * less, but it lets a tile appended at the bottom move a row at the top, and
 * the ribbon appends a chunk of 300 under a reader who is looking at the
 * middle of it. Here a row depends only on its own tiles and the one after,
 * so appending can only ever change the trailing row.
 */

export type RibbonRow = {
  /** Index of the row's first tile. */
  start: number;
  /** One past its last tile. */
  end: number;
  /** What every tile in the row is multiplied by to fill it — over 1 is
   *  stretched, under 1 squeezed. Null for a trailing row left at natural
   *  width because filling it would stretch it past `maxTrailingStretch`. */
  scale: number | null;
};

/**
 * @param ratios Width over height of each tile, in order.
 * @param width The width a row has to fill, in px.
 * @param height The row height, in px.
 * @param gap Space between neighbouring tiles in a row, in px.
 * @param maxTrailingStretch How far the last row may be stretched before it
 *   is left short instead. It has no following tile to take in, so a last row
 *   of two photographs would otherwise be stretched across the whole width.
 */
export function ribbonRows(
  ratios: readonly number[],
  width: number,
  height: number,
  gap: number,
  maxTrailingStretch: number,
): RibbonRow[] {
  const rows: RibbonRow[] = [];
  if (!(width > 0) || !(height > 0)) return rows;

  let start = 0;
  while (start < ratios.length) {
    // As many tiles as fit at their natural width, and never fewer than one:
    // a frame wider than the whole row is a row by itself, squeezed to fit.
    let natural = ratios[start] * height;
    let end = start + 1;
    while (end < ratios.length) {
      const withNext = natural + ratios[end] * height;
      if (withNext + gap * (end - start) > width) break;
      natural = withNext;
      end++;
    }
    const stretch = (width - gap * (end - start - 1)) / natural;

    if (end === ratios.length) {
      rows.push({ start, end, scale: stretch <= maxTrailingStretch ? stretch : null });
      break;
    }

    // The same row with the tile that did not fit squeezed in. Compared on
    // the log so that 1.25x wide and 0.8x wide count as the same crop.
    const squeeze = (width - gap * (end - start)) / (natural + ratios[end] * height);
    if (squeeze > 0 && Math.abs(Math.log(squeeze)) < Math.abs(Math.log(stretch))) {
      rows.push({ start, end: end + 1, scale: squeeze });
      start = end + 1;
    } else {
      rows.push({ start, end, scale: stretch });
      start = end;
    }
  }
  return rows;
}

/*
 * POSITIONS AND OFFSETS
 * ---------------------
 * With the row height fixed, the ribbon's geometry is arithmetic: row `r`
 * starts `r * pitch` down, where the pitch is the row height plus the gap
 * under it. The two functions below convert between that and a position in
 * the sweep — a photo's index plus how far past it, so 12.5 is halfway through
 * photo 12 — which is what the colour scale is drawn in.
 *
 * Inside a row, position runs evenly from the row's first photo at its top
 * edge to the next row's first photo at its bottom edge. Nothing on the page
 * is laid out that way; it is there so the two functions are exact inverses
 * and continuous. Scrolling moves the marker smoothly instead of in one jump
 * per row, and a drag on the scale lands the page where the marker then
 * reads back the same place, so marker and pointer never part.
 */

/** Index into `rows` of the row holding `tile`. `rows` must cover the tile. */
export function rowOf(rows: readonly RibbonRow[], tile: number): number {
  let lo = 0;
  let hi = rows.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (rows[mid].start <= tile) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** Pixels from the top of the ribbon to `position` in the sweep. */
export function offsetOfPosition(
  rows: readonly RibbonRow[],
  position: number,
  pitch: number,
): number {
  if (rows.length === 0) return 0;
  const last = rows[rows.length - 1].end;
  const clamped = Math.min(last, Math.max(0, position));
  const r = rowOf(rows, Math.min(last - 1, Math.floor(clamped)));
  const row = rows[r];
  return (r + (clamped - row.start) / (row.end - row.start)) * pitch;
}

/** The position in the sweep `offset` pixels down the ribbon. */
export function positionAtOffset(
  rows: readonly RibbonRow[],
  offset: number,
  pitch: number,
): number {
  if (rows.length === 0) return 0;
  const r = Math.min(rows.length - 1, Math.max(0, Math.floor(offset / pitch)));
  const along = Math.min(1, Math.max(0, offset / pitch - r));
  const row = rows[r];
  return row.start + along * (row.end - row.start);
}
