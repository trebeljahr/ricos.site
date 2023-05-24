import { readFileSync } from "fs";
import ExifReader from "exifreader";

export async function getExifData(imagePath: string) {
  try {
    const fileBuffer = readFileSync(imagePath);
    const tags = ExifReader.load(fileBuffer, { expanded: true });

    // const tags = await exiftool.read(imagePath);
    const width = tags.file?.["Image Width"]?.value;
    const height = tags.file?.["Image Height"]?.value;

    if (!width || !height) throw new Error("No width or height found on image");

    return { width, height, imagePath };
  } catch (err) {
    throw new Error(`Error processing ${imagePath}: ${err}`);
  }
}
