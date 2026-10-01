export function parseByteBits(input: string): number | null {
  const bits = input.replace(/[\s_]/g, "");
  return /^[01]{8}$/.test(bits) ? Number.parseInt(bits, 2) : null;
}

export function byteBits(value: number): string {
  return value.toString(2).padStart(8, "0");
}

export function signedByte(value: number): number {
  return value < 128 ? value : value - 256;
}

export function asciiCharacter(value: number): string | null {
  return value >= 32 && value <= 126 ? String.fromCharCode(value) : null;
}

// Educational IEEE-like minifloat: sign 1, exponent 4 (bias 7), fraction 3.
// Exponent 15 is reserved for infinity/NaN, as in IEEE 754.
export function float8E4M3(value: number): number {
  const sign = value & 0x80 ? -1 : 1;
  const exponent = (value >> 3) & 0xf;
  const fraction = value & 0x7;
  if (exponent === 15) return fraction === 0 ? sign * Infinity : NaN;
  if (exponent === 0) return sign * (fraction / 8) * 2 ** -6;
  return sign * (1 + fraction / 8) * 2 ** (exponent - 7);
}

export function rgb332(value: number): { red: number; green: number; blue: number; hex: string } {
  const red = Math.round((((value >> 5) & 0x7) * 255) / 7);
  const green = Math.round((((value >> 2) & 0x7) * 255) / 7);
  const blue = Math.round(((value & 0x3) * 255) / 3);
  const hex = `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
  return { red, green, blue, hex };
}
