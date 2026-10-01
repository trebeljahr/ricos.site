export function parseFourBytes(input: string): Uint8Array | null {
  const hex = input.replace(/[\s_]/g, "");
  if (!/^[0-9a-fA-F]{8}$/.test(hex)) return null;
  return new Uint8Array(hex.match(/.{2}/g)?.map((pair) => Number.parseInt(pair, 16)) ?? []);
}

export function formatFourBytes(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0").toUpperCase()).join(" ");
}

export function fourByteReadings(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const unsigned = view.getUint32(0, false);
  const signed = view.getInt32(0, false);
  const float = view.getFloat32(0, false);
  let utf8: string | null;
  try {
    utf8 = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    utf8 = null;
  }
  const [red, green, blue, alpha] = bytes;
  return { unsigned, signed, float, utf8, red, green, blue, alpha };
}
