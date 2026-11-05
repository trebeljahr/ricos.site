export type SignedWidth = 4 | 8;
export type IntegerEncoding = "unsigned" | "sign-magnitude" | "ones-complement" | "twos-complement";

export const INTEGER_ENCODINGS: { id: IntegerEncoding; label: string }[] = [
  { id: "unsigned", label: "Unsigned" },
  { id: "sign-magnitude", label: "Sign + magnitude" },
  { id: "ones-complement", label: "Ones’ complement" },
  { id: "twos-complement", label: "Two’s complement" },
];

export const bitMask = (width: SignedWidth) => 2 ** width - 1;
export const bitPattern = (raw: number, width: SignedWidth) =>
  (raw & bitMask(width)).toString(2).padStart(width, "0");

/** Interpretation only. Preserve negative zero. */
export function decodeInteger(raw: number, width: SignedWidth, encoding: IntegerEncoding): number {
  const value = raw & bitMask(width);
  const sign = 2 ** (width - 1);
  if (encoding === "unsigned" || value < sign) return value;
  if (encoding === "sign-magnitude") return -(value & (sign - 1));
  if (encoding === "ones-complement") return -(bitMask(width) ^ value);
  return value - 2 ** width;
}

/**
 * What a set bit adds to the value. Only the top bit differs between encodings.
 * Sign + magnitude's sign bit adds nothing: it flips the sum of the others.
 */
export function bitWeight(bit: number, width: SignedWidth, encoding: IntegerEncoding): number {
  if (bit !== width - 1 || encoding === "unsigned") return 2 ** bit;
  if (encoding === "twos-complement") return -(2 ** bit);
  if (encoding === "ones-complement") return -(2 ** bit - 1);
  return 0;
}

export const displayInteger = (value: number) =>
  Object.is(value, -0) ? "−0" : String(value).replace("-", "−");
