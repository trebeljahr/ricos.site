// SVG attributes are rendered on the server and again in the browser; floats
// from Math.sin, Math.log and friends can differ in the last digits between
// the two, which React reports as a hydration mismatch. Round them first.

/** A coordinate, to 2 decimals. */
export const r2 = (n: number) => Math.round(n * 100) / 100;

/** An opacity or other 0–1 value, to 3 decimals. */
export const r3 = (n: number) => Math.round(n * 1000) / 1000;
