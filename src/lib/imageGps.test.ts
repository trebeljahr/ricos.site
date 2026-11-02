import { describe, expect, it } from "vitest";

import { imageHasGps, WEBP_HEADER_BYTES, webpMayCarryMetadata } from "./imageGps";

const GPS_IFD_POINTER = 0x8825;
const GPS_VERSION = 0x0000;
const GPS_LATITUDE = 0x0002;
const ORIENTATION = 0x0112;

/** A TIFF block with one IFD0 entry that points at a GPS IFD holding `gpsTags`. */
function tiff(
  gpsTags: number[],
  { littleEndian = true, ifd0Tag = GPS_IFD_POINTER, hasFix = true } = {},
): Buffer {
  const gpsOffset = 8 + 2 + 12 + 4;
  const valuesOffset = gpsOffset + 2 + gpsTags.length * 12 + 4;
  const out = Buffer.alloc(valuesOffset + 24);
  const u16 = (value: number, at: number) =>
    littleEndian ? out.writeUInt16LE(value, at) : out.writeUInt16BE(value, at);
  const u32 = (value: number, at: number) =>
    littleEndian ? out.writeUInt32LE(value, at) : out.writeUInt32BE(value, at);

  out.write(littleEndian ? "II*\0" : "MM\0*", 0, "latin1");
  u32(8, 4);
  u16(1, 8);
  u16(ifd0Tag, 10);
  u16(4, 12);
  u32(1, 14);
  u32(gpsOffset, 18);
  u16(gpsTags.length, gpsOffset);
  gpsTags.forEach((tag, i) => {
    const entry = gpsOffset + 2 + i * 12;
    u16(tag, entry);
    u16(5, entry + 2);
    u32(3, entry + 4);
    u32(valuesOffset, entry + 8);
  });
  if (hasFix) out.fill(1, valuesOffset);
  return out;
}

function jpeg(exif: Buffer): Buffer {
  const payload = Buffer.concat([Buffer.from("Exif\0\0", "latin1"), exif]);
  const length = Buffer.alloc(2);
  length.writeUInt16BE(payload.length + 2);
  return Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe1]), length, payload]);
}

function riffWebp(firstChunk: Buffer): Buffer {
  return Buffer.concat([Buffer.from("RIFF\0\0\0\0WEBP", "latin1"), firstChunk]);
}

describe("imageHasGps", () => {
  it("finds a position in JPEG EXIF", () => {
    expect(imageHasGps(jpeg(tiff([GPS_VERSION, GPS_LATITUDE])))).toBe(true);
  });

  it("reads big-endian EXIF too", () => {
    expect(imageHasGps(jpeg(tiff([GPS_LATITUDE], { littleEndian: false })))).toBe(true);
  });

  it("finds a position in a WebP EXIF chunk", () => {
    const chunk = Buffer.concat([Buffer.from("EXIF\0\0\0\0", "latin1"), tiff([GPS_LATITUDE])]);
    expect(imageHasGps(riffWebp(chunk))).toBe(true);
  });

  it("finds a position in XMP", () => {
    const xmp = Buffer.from('<rdf:Description exif:GPSLatitude="23,12.3N"/>', "latin1");
    expect(imageHasGps(Buffer.concat([Buffer.from([0xff, 0xd8]), xmp]))).toBe(true);
  });

  it("passes EXIF that has no GPS block", () => {
    expect(imageHasGps(jpeg(tiff([], { ifd0Tag: ORIENTATION })))).toBe(false);
  });

  it("passes a GPS block without a position", () => {
    expect(imageHasGps(jpeg(tiff([GPS_VERSION])))).toBe(false);
  });

  it("passes position tags that hold 0/0, as a Pixel 6 writes without a fix", () => {
    expect(imageHasGps(jpeg(tiff([GPS_LATITUDE], { hasFix: false })))).toBe(false);
  });

  it("ignores a truncated TIFF header in image data", () => {
    const noise = Buffer.concat([Buffer.alloc(64, 0xab), Buffer.from("II*\0\xff\xff", "latin1")]);
    expect(imageHasGps(noise)).toBe(false);
  });
});

describe("webpMayCarryMetadata", () => {
  const vp8x = (flags: number) => {
    const header = riffWebp(
      Buffer.concat([Buffer.from("VP8X\0\0\0\0", "latin1"), Buffer.alloc(1)]),
    );
    header[20] = flags;
    return header;
  };

  it("clears plain WebP, which has no room for metadata", () => {
    const plain = riffWebp(Buffer.from("VP8 \0\0\0\0\0", "latin1"));
    expect(plain.length).toBe(WEBP_HEADER_BYTES);
    expect(webpMayCarryMetadata(plain)).toBe(false);
  });

  it("clears extended WebP that only declares alpha or animation", () => {
    expect(webpMayCarryMetadata(vp8x(0x10 | 0x02))).toBe(false);
  });

  it("flags extended WebP that declares EXIF or XMP", () => {
    expect(webpMayCarryMetadata(vp8x(0x08))).toBe(true);
    expect(webpMayCarryMetadata(vp8x(0x04))).toBe(true);
  });

  it("flags anything that is not WebP", () => {
    expect(webpMayCarryMetadata(Buffer.alloc(WEBP_HEADER_BYTES, 0xff))).toBe(true);
  });
});
