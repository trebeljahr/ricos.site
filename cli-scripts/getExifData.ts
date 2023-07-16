import sizeOf from "image-size";

export async function getWidthAndHeight(imagePath: string) {
  try {
    const { width, height } = sizeOf(imagePath);

    return { width, height, imagePath };
  } catch (err) {
    throw new Error(`Error processing ${imagePath}: ${err}`);
  }
}
