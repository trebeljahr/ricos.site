/**
 * The pile's geometry, shared by the still bales the server renders and the
 * egg that replaces them on the client, so the swap never moves a bale.
 */
export const SIZE = 46;
/** Height of one bale drawn at SIZE, from the drawing's 44 x 38 viewBox. */
export const BALE_H = (SIZE * 38) / 44;
/** Offsets of the bales in the pile, back row first so the front overlaps it. */
export const PILE = [
  { x: 34, y: 0 },
  { x: 98, y: 6 },
  { x: 160, y: 1 },
  { x: 0, y: 46 },
  { x: 62, y: 52 },
  { x: 126, y: 48 },
  { x: 188, y: 53 },
];
export const PILE_W = Math.max(...PILE.map((p) => p.x)) + SIZE;
export const PILE_H = Math.max(...PILE.map((p) => p.y)) + BALE_H;
