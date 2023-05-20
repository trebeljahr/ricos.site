import { exiftool } from "exiftool-vendored";

export async function getExifData(imagePath: string) {
  try {
    const tags = await exiftool.read(imagePath);
    const width = tags.ImageWidth;
    const height = tags.ImageHeight;
    if (!width || !height) throw new Error("No width or height found on image");

    return { width, height, imagePath };
  } catch (err) {
    throw new Error(`Error processing ${imagePath}: ${err}`);
  } finally {
    exiftool.end();
  }
}
