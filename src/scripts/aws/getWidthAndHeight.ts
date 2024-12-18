import sizeOf from "image-size";

export async function getWidthAndHeightFromFileSystem(imagePath: string) {
  try {
    const { width, height } = sizeOf(imagePath);

    if (!width || !height) {
      throw new Error("Failed to get image dimensions");
    }

    return { width, height, imagePath };
  } catch (err) {
    console.error(`\nError processing ${imagePath}: ${err}`);
    throw err;
  }
}
