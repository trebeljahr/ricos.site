export type ReadDirection = "ltr" | "rtl";

/** One way of walking over a byte sequence: which byte comes first, and which end of each byte. */
export type ReadOrder = { bytes: ReadDirection; bits: ReadDirection };

/**
 * The four orders chapter 1.1 lists, in the chapter's sequence. The first is
 * what "big endian" names and the last what "little endian" names; the two in
 * between also flip the bits inside each byte.
 */
export const readOrders = [
  { bytes: "ltr", bits: "ltr" },
  { bytes: "rtl", bits: "rtl" },
  { bytes: "ltr", bits: "rtl" },
  { bytes: "rtl", bits: "ltr" },
] as const satisfies readonly ReadOrder[];

export function parseTwoBytes(input: string): Uint8Array | null {
  const hex = input.replace(/[\s_]/g, "");
  if (!/^[0-9a-fA-F]{4}$/.test(hex)) return null;
  return new Uint8Array([Number.parseInt(hex.slice(0, 2), 16), Number.parseInt(hex.slice(2), 16)]);
}

export function formatTwoBytes(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0").toUpperCase()).join(" ");
}

/**
 * The positions of a written-out bit row in the order they get read. Position
 * 0 is the leftmost bit of the first byte, the last position the rightmost bit
 * of the last byte.
 */
export function readSequence(order: ReadOrder, byteCount = 2): number[] {
  const sequence: number[] = [];
  for (let byteStep = 0; byteStep < byteCount; byteStep++) {
    const byteIndex = order.bytes === "ltr" ? byteStep : byteCount - 1 - byteStep;
    for (let bitStep = 0; bitStep < 8; bitStep++) {
      sequence.push(byteIndex * 8 + (order.bits === "ltr" ? bitStep : 7 - bitStep));
    }
  }
  return sequence;
}

/** Reads the bytes in the given order. The first bit read becomes the highest bit of the value. */
export function readBytes(bytes: Uint8Array, order: ReadOrder): { bits: string; value: number } {
  const row = [...bytes].map((byte) => byte.toString(2).padStart(8, "0")).join("");
  const bits = readSequence(order, bytes.length)
    .map((position) => row[position])
    .join("");
  return { bits, value: Number.parseInt(bits, 2) };
}
