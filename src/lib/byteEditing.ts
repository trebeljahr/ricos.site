import { float8E4M3, hueColor, rgb332, xtermColor } from "./byteInterpretations";

export type ByteReading =
  | "unsigned"
  | "signed"
  | "fixed"
  | "float"
  | "ascii"
  | "latin1"
  | "unicode";
export type ByteColor = "rgb332" | "grayscale" | "indexed" | "hue";

type EditResult = { value: number } | { error: string };

function rgb(hex: string): [number, number, number] | null {
  if (!/^#[\da-f]{6}$/i.test(hex)) return null;
  return [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16)) as [
    number,
    number,
    number,
  ];
}

function hex([red, green, blue]: [number, number, number]): string {
  return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function xtermRgb(value: number): [number, number, number] {
  const color = xtermColor(value);
  if (color.startsWith("#")) return rgb(color) ?? [0, 0, 0];
  const channels = color.match(/\d+/g)?.map(Number);
  return (channels ?? [0, 0, 0]) as [number, number, number];
}

function hueRgb(value: number): [number, number, number] {
  const hue = Number(hueColor(value).match(/\d+/)?.[0] ?? 0) / 60;
  const chroma = 0.8;
  const x = chroma * (1 - Math.abs((hue % 2) - 1));
  const parts: [number, number, number] =
    hue < 1
      ? [chroma, x, 0]
      : hue < 2
        ? [x, chroma, 0]
        : hue < 3
          ? [0, chroma, x]
          : hue < 4
            ? [0, x, chroma]
            : hue < 5
              ? [x, 0, chroma]
              : [chroma, 0, x];
  return parts.map((part) => Math.round((part + 0.1) * 255)) as [number, number, number];
}

export function byteColorHex(kind: ByteColor, value: number): string {
  if (kind === "rgb332") return rgb332(value).hex;
  if (kind === "grayscale") return hex([value, value, value]);
  if (kind === "indexed") return hex(xtermRgb(value));
  return hex(hueRgb(value));
}

export function encodeByteColor(kind: ByteColor, color: string): EditResult {
  const channels = rgb(color);
  if (!channels) return { error: "Choose a six-digit hex color." };
  const [red, green, blue] = channels;
  if (kind === "rgb332") {
    return {
      value:
        (Math.round((red * 7) / 255) << 5) |
        (Math.round((green * 7) / 255) << 2) |
        Math.round((blue * 3) / 255),
    };
  }
  if (kind === "grayscale")
    return { value: Math.round(red * 0.2126 + green * 0.7152 + blue * 0.0722) };
  if (kind === "indexed") {
    let best = 0;
    let distance = Infinity;
    for (let index = 0; index < 256; index++) {
      const candidate = xtermRgb(index);
      const score =
        (red - candidate[0]) ** 2 + (green - candidate[1]) ** 2 + (blue - candidate[2]) ** 2;
      if (score < distance) {
        distance = score;
        best = index;
      }
    }
    return { value: best };
  }
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  if (delta === 0) return { value: 0 };
  let degrees =
    max === red
      ? ((green - blue) / delta) % 6
      : max === green
        ? (blue - red) / delta + 2
        : (red - green) / delta + 4;
  degrees = (degrees * 60 + 360) % 360;
  return { value: Math.round((degrees * 256) / 360) % 256 };
}

export function encodeByteReading(kind: ByteReading, text: string): EditResult {
  const trimmed = text.trim();
  if (kind === "ascii" || kind === "latin1" || kind === "unicode") {
    if (kind === "unicode" && /^U\+[\da-f]{1,6}$/i.test(trimmed)) {
      const codePoint = Number.parseInt(trimmed.slice(2), 16);
      return codePoint <= 255
        ? { value: codePoint }
        : { error: "This code point needs more than one byte." };
    }
    const characters = [...text];
    if (characters.length !== 1) return { error: "Enter one character." };
    const codePoint = characters[0].codePointAt(0) ?? 0;
    if (kind === "ascii" && (codePoint < 32 || codePoint > 126))
      return { error: "Printable ASCII uses codes 32–126." };
    if (codePoint > 255)
      return { error: "This character does not fit in one byte. Try the four-byte demo." };
    return { value: codePoint };
  }
  if (!trimmed) return { error: "Enter a number." };
  if (kind === "float") {
    if (/^nan$/i.test(trimmed)) return { value: 0x79 };
    if (/^\+?infinity$/i.test(trimmed)) return { value: 0x78 };
    if (/^-infinity$/i.test(trimmed)) return { value: 0xf8 };
    if (trimmed === "-0") return { value: 0x80 };
    const target = Number(trimmed);
    if (!Number.isFinite(target)) return { error: "Enter a finite number, Infinity, or NaN." };
    if (Math.abs(target) > 240) return { error: "E4M3 only reaches ±240." };
    let best = 0;
    let distance = Infinity;
    for (let index = 0; index < 256; index++) {
      const candidate = float8E4M3(index);
      if (!Number.isFinite(candidate)) continue;
      const score = Math.abs(candidate - target);
      if (score < distance) {
        distance = score;
        best = index;
      }
    }
    return { value: best };
  }
  const number = Number(trimmed);
  if (!Number.isFinite(number)) return { error: "Enter a valid number." };
  if (kind === "fixed") {
    if (number < -8 || number > 7.9375) return { error: "Q4.4 ranges from −8 to 7.9375." };
    return { value: (Math.round(number * 16) + 256) % 256 };
  }
  if (!Number.isInteger(number)) return { error: "Enter a whole number." };
  if (kind === "unsigned")
    return number >= 0 && number <= 255 ? { value: number } : { error: "Unsigned byte: 0–255." };
  return number >= -128 && number <= 127
    ? { value: (number + 256) % 256 }
    : { error: "Signed byte: −128–127." };
}
