/**
 * Does an image file reveal where it was taken?
 *
 * Reads bytes only, so it needs neither exiftool nor sharp and works on any
 * container. EXIF is a TIFF block wherever it is stored (JPEG APP1, PNG eXIf,
 * WebP EXIF, HEIF), so this looks for TIFF headers instead of parsing each
 * format. A header that appears by chance in compressed data fails the walk
 * below. XMP is plain text in every container, so a text search finds it.
 */
const TIFF_LITTLE_ENDIAN = Buffer.from("II*\0", "latin1");
const TIFF_BIG_ENDIAN = Buffer.from("MM\0*", "latin1");
const TIFF_ENTRY_SIZE = 12;
const GPS_IFD_POINTER = 0x8825;
const GPS_LATITUDE = 0x0002;
const GPS_LONGITUDE = 0x0004;
const RATIONAL_SIZE = 8;

function tiffHasPosition(bytes: Buffer, start: number): boolean {
  const littleEndian = bytes[start] === TIFF_LITTLE_ENDIAN[0];
  const u16 = (at: number) => (littleEndian ? bytes.readUInt16LE(at) : bytes.readUInt16BE(at));
  const u32 = (at: number) => (littleEndian ? bytes.readUInt32LE(at) : bytes.readUInt32BE(at));

  try {
    const ifd0 = start + u32(start + 4);
    for (let i = 0; i < u16(ifd0); i++) {
      const entry = ifd0 + 2 + i * TIFF_ENTRY_SIZE;
      if (u16(entry) !== GPS_IFD_POINTER) continue;

      // A GPS block without a position is harmless: without a fix, cameras write
      // only the version tag, or position tags that hold 0/0 (Pixel 6).
      const gpsIfd = start + u32(entry + 8);
      for (let j = 0; j < u16(gpsIfd); j++) {
        const gpsEntry = gpsIfd + 2 + j * TIFF_ENTRY_SIZE;
        const tag = u16(gpsEntry);
        if (tag !== GPS_LATITUDE && tag !== GPS_LONGITUDE) continue;

        const values = start + u32(gpsEntry + 8);
        const size = u32(gpsEntry + 4) * RATIONAL_SIZE;
        if (bytes.subarray(values, values + size).some((byte) => byte !== 0)) return true;
      }
    }
  } catch {
    // Read past the end of the file: not a real TIFF block.
  }
  return false;
}

export function imageHasGps(bytes: Buffer): boolean {
  if (bytes.includes("GPSLatitude")) return true;

  for (const magic of [TIFF_LITTLE_ENDIAN, TIFF_BIG_ENDIAN]) {
    let at = bytes.indexOf(magic);
    while (at !== -1) {
      if (tiffHasPosition(bytes, at)) return true;
      at = bytes.indexOf(magic, at + 1);
    }
  }
  return false;
}

/** Bytes of a file `webpMayCarryMetadata` needs to read. */
export const WEBP_HEADER_BYTES = 21;

const VP8X_EXIF_FLAG = 0x08;
const VP8X_XMP_FLAG = 0x04;

/**
 * Answers from the start of a file, so a range request can check a whole bucket
 * cheaply. Plain WebP (VP8, VP8L) has no room for metadata. Extended WebP (VP8X)
 * declares it in a flag byte. Anything else is not the variant we expected.
 */
export function webpMayCarryMetadata(header: Uint8Array): boolean {
  const text = (from: number, to: number) => String.fromCharCode(...header.subarray(from, to));
  if (text(0, 4) !== "RIFF" || text(8, 12) !== "WEBP") return true;
  if (text(12, 16) !== "VP8X") return false;
  return (header[20] & (VP8X_EXIF_FLAG | VP8X_XMP_FLAG)) !== 0;
}
