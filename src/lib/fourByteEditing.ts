export type FourByteReading = "unsigned" | "signed" | "float" | "text" | "color";
type EditResult = { bytes: Uint8Array } | { error: string };

function wordBytes(write: (view: DataView) => void): Uint8Array {
  const bytes = new Uint8Array(4);
  write(new DataView(bytes.buffer));
  return bytes;
}

export function encodeFourByteReading(
  kind: FourByteReading,
  text: string,
  alpha = 255,
  littleEndian = false,
): EditResult {
  const trimmed = text.trim();
  if (kind === "text") {
    const bytes = new TextEncoder().encode(text);
    if (bytes.length !== 4)
      return {
        error: `UTF-8 uses ${bytes.length} byte${bytes.length === 1 ? "" : "s"} here. Enter text that uses exactly four.`,
      };
    return { bytes };
  }
  if (kind === "color") {
    if (!/^#[\da-f]{6}$/i.test(trimmed)) return { error: "Choose a six-digit RGB color." };
    if (!Number.isInteger(alpha) || alpha < 0 || alpha > 255)
      return { error: "Alpha must be 0–255." };
    return {
      bytes: new Uint8Array(
        [1, 3, 5]
          .map((offset) => Number.parseInt(trimmed.slice(offset, offset + 2), 16))
          .concat(alpha),
      ),
    };
  }
  if (!trimmed) return { error: "Enter a number." };
  if (kind === "float") {
    if (/^nan$/i.test(trimmed))
      return { bytes: wordBytes((view) => view.setUint32(0, 0x7fc00000, littleEndian)) };
    const number = Number(trimmed);
    if (Number.isNaN(number)) return { error: "Enter a number, Infinity, or NaN." };
    if (Number.isFinite(number) && Math.abs(number) > 3.4028234663852886e38)
      return { error: "Outside the finite float32 range." };
    return { bytes: wordBytes((view) => view.setFloat32(0, number, littleEndian)) };
  }
  const number = Number(trimmed);
  if (!Number.isInteger(number)) return { error: "Enter a whole number." };
  if (kind === "unsigned") {
    if (number < 0 || number > 4294967295) return { error: "Unsigned int32: 0–4,294,967,295." };
    return { bytes: wordBytes((view) => view.setUint32(0, number, littleEndian)) };
  }
  if (number < -2147483648 || number > 2147483647)
    return { error: "Signed int32: −2,147,483,648–2,147,483,647." };
  return { bytes: wordBytes((view) => view.setInt32(0, number, littleEndian)) };
}
