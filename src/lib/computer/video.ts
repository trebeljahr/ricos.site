// Video timing for the screens. A scanout reads the framebuffer the way a
// CRT controller does: one pixel per clock tick, left to right, top to bottom.
// After the visible lines come as many blank lines (vertical blanking), so an
// 8×8 frame is 16 lines of 8 ticks. The blank lines are long on purpose: 64
// ticks is enough for the toy CPU to rewrite all 8 rows before the beam comes
// back.
//
// Every function takes an optional screen size; without one it is the 8×8
// screen the CPU writes at F0–F7.

/**
 * A screen size in pixels. `width` is a multiple of 8, so each row is
 * width / 8 whole bytes; both sides are powers of two, so a pixel's address is
 * just its y bits followed by its x bits.
 */
export type ScreenSize = { width: number; height: number };

export const SCREEN_8X8: ScreenSize = { width: 8, height: 8 };
/** The sizes the demos offer. 512×512 runs as a model only: no block has that many ports. */
export const SCREEN_SIZES = {
  "8×8": SCREEN_8X8,
  "16×16": { width: 16, height: 16 },
  "32×32": { width: 32, height: 32 },
  "512×512": { width: 512, height: 512 },
} as const satisfies Record<string, ScreenSize>;

/** Bytes in one row of a frame. */
export const rowBytes = (size: ScreenSize) => size.width / 8;
/** Bytes in a whole frame: row y's byte c is at y * rowBytes + c. */
export const frameBytes = (size: ScreenSize) => rowBytes(size) * size.height;
/** A dark frame. */
export const blankFrame = (size: ScreenSize = SCREEN_8X8) =>
  Array<number>(frameBytes(size)).fill(0);
/** Address bits needed for `count` items (count is a power of two). */
export const bitsFor = (count: number) => Math.round(Math.log2(count));

/** Whether pixel (x, y) is lit: bit x mod 8 of byte x / 8 in row y. */
export const pixelAt = (frame: readonly number[], size: ScreenSize, x: number, y: number) =>
  Boolean(((frame[y * rowBytes(size) + (x >> 3)] ?? 0) >> (x & 7)) & 1);

/** Lit pixels in a frame. */
export function litPixels(frame: readonly number[]): number {
  let lit = 0;
  for (let byte of frame) for (; byte; byte &= byte - 1) lit++;
  return lit;
}

export const SCAN_COLUMNS = SCREEN_8X8.width;
export const VISIBLE_LINES = SCREEN_8X8.height;
export const SCAN_LINES = 2 * VISIBLE_LINES;
export const VISIBLE_TICKS = SCAN_COLUMNS * VISIBLE_LINES;
export const FRAME_TICKS = SCAN_COLUMNS * SCAN_LINES;

/** A frame's timing: `width` ticks per line, `height` visible lines, then as many blank. */
export const videoTiming = (size: ScreenSize = SCREEN_8X8) => ({
  columns: size.width,
  visibleLines: size.height,
  scanLines: 2 * size.height,
  visibleTicks: size.width * size.height,
  frameTicks: 2 * size.width * size.height,
});

/**
 * Where the beam is on one tick. HSYNC is the last tick of a line, VSYNC the
 * last tick of a frame; a monitor uses them to start its next line and frame.
 */
export type Beam = { x: number; y: number; vblank: boolean; hsync: boolean; vsync: boolean };

/** The scanout's beam on tick `tick`, counting from reset. */
export function beamAt(tick: number, size: ScreenSize = SCREEN_8X8): Beam {
  const { columns, visibleLines, scanLines, frameTicks } = videoTiming(size);
  const position = ((tick % frameTicks) + frameTicks) % frameTicks;
  const x = position % columns;
  const y = Math.floor(position / columns);
  const hsync = x === columns - 1;
  return { x, y, vblank: y >= visibleLines, hsync, vsync: hsync && y === scanLines - 1 };
}

/** The pixel the scanout sends on `beam`: framebuffer pixel (x, y), dark while blanking. */
export const beamPixel = (
  frame: readonly number[],
  beam: Pick<Beam, "x" | "y" | "vblank">,
  size: ScreenSize = SCREEN_8X8,
) => !beam.vblank && pixelAt(frame, size, beam.x, beam.y);

/** A frame after the beam passes: pixel (x, y) takes `pixel`, the rest stay lit or dark. */
export function paint(
  image: readonly number[],
  x: number,
  y: number,
  pixel: boolean,
  size: ScreenSize = SCREEN_8X8,
): number[] {
  if (y >= size.height || x >= size.width) return [...image];
  const next = [...image];
  const at = y * rowBytes(size) + (x >> 3);
  const bit = 1 << (x & 7);
  next[at] = pixel ? (next[at] | bit) & 255 : next[at] & ~bit & 255;
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
 * passes that pixel. It keeps one image per tick, so it suits screens up to
 * about 32×32: a 512×512 frame is 262,144 ticks of 32 KB images.
 */
export function scanoutTrace(
  screens: readonly (readonly number[])[],
  size: ScreenSize = SCREEN_8X8,
): ScanoutFrame[] {
  let image = blankFrame(size);
  let before: readonly number[] = image;
  return screens.map((after, tick) => {
    const beam = beamAt(tick, size);
    const pixel = beamPixel(before, beam, size);
    image = paint(image, beam.x, beam.y, pixel, size);
    before = after;
    return { beam, pixel, image, next: beamAt(tick + 1, size) };
  });
}
