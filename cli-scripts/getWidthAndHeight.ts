import sizeOf from "image-size";

export async function getWidthAndHeight(imagePath: string) {
  try {
    const { width, height } = sizeOf(imagePath);

    return { width, height, imagePath };
  } catch (err) {
    console.error(`Error processing ${imagePath}: ${err}`);
  }
}
