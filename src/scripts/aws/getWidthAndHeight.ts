import { createReadStream } from "fs";
import probe from "probe-image-size";

export async function getWidthAndHeightFromFileSystem(imagePath: string) {
  try {
    const { width, height } = await probe(createReadStream(imagePath));

    if (!width || !height) {
      throw new Error("Failed to get image dimensions");
    }

    return { width, height, imagePath };
  } catch (err) {
    console.error(`\nError processing ${imagePath}: ${err}`);
    throw err;
  }
}
