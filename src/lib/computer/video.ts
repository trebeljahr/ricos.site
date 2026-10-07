// Video timing for the 8×8 screen. A scanout reads the framebuffer the way a
// CRT controller does: one pixel per clock tick, left to right, top to bottom.
// After the 8 visible lines come 8 blank lines (vertical blanking), so a frame
// is 16 lines of 8 ticks. The blank lines are long on purpose: 64 ticks is
// enough for the toy CPU to rewrite all 8 rows before the beam comes back.

export const SCAN_COLUMNS = 8;
export const VISIBLE_LINES = 8;
export const SCAN_LINES = 16;
export const VISIBLE_TICKS = SCAN_COLUMNS * VISIBLE_LINES;
export const FRAME_TICKS = SCAN_COLUMNS * SCAN_LINES;

/**
 * Where the beam is on one tick. HSYNC is the last tick of a line, VSYNC the
 * last tick of a frame; a monitor uses them to start its next line and frame.
 */
export type Beam = { x: number; y: number; vblank: boolean; hsync: boolean; vsync: boolean };

/** The scanout's beam on tick `tick`, counting from reset. */
export function beamAt(tick: number): Beam {
  const position = ((tick % FRAME_TICKS) + FRAME_TICKS) % FRAME_TICKS;
  const x = position % SCAN_COLUMNS;
  const y = Math.floor(position / SCAN_COLUMNS);
  const hsync = x === SCAN_COLUMNS - 1;
  return { x, y, vblank: y >= VISIBLE_LINES, hsync, vsync: hsync && y === SCAN_LINES - 1 };
}

/** The pixel the scanout sends on `beam`: framebuffer bit (x, y), dark while blanking. */
export const beamPixel = (rows: readonly number[], beam: Pick<Beam, "x" | "y" | "vblank">) =>
  !beam.vblank && Boolean(((rows[beam.y] ?? 0) >> beam.x) & 1);

/** A monitor image after the beam passes: pixel (x, y) takes `pixel`, the rest stay lit or dark. */
export function paint(image: readonly number[], x: number, y: number, pixel: boolean): number[] {
  if (y >= VISIBLE_LINES) return [...image];
  const next = [...image];
  next[y] = pixel ? (next[y] | (1 << x)) & 255 : next[y] & ~(1 << x) & 255;
  return next;
}

/** One tick of the screen as the viewer sees it. */
export type ScanoutFrame = {
  /** The beam on this tick: the pixel it read and painted. */
  beam: Beam;
  pixel: boolean;
  /** The monitor's image after this tick's clock edge. */
  image: number[];
  /** The beam on the next tick: where the monitor will paint next. */
  next: Beam;
};

/**
 * What the monitor shows after each tick, given the framebuffer after each
 * tick (e.g. `traceTicks(...).map((tick) => tick.screen)`). On tick i the
 * scanout reads the framebuffer as it was before tick i's clock edge, so a
 * write on tick i reaches the monitor from tick i + 1 on, once the beam
 * passes that pixel.
 */
export function scanoutTrace(screens: readonly (readonly number[])[]): ScanoutFrame[] {
  let image = Array<number>(VISIBLE_LINES).fill(0);
  let before: readonly number[] = image;
  return screens.map((after, tick) => {
    const beam = beamAt(tick);
    const pixel = beamPixel(before, beam);
    image = paint(image, beam.x, beam.y, pixel);
    before = after;
    return { beam, pixel, image, next: beamAt(tick + 1) };
  });
}
