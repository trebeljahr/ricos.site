import fetch from "node-fetch";
import sizeOf from "image-size";
import { Buffer } from "buffer";
import { nextImageUrl } from "./mapToImageProps";
import pLimit from "p-limit";

const limit = pLimit(1000);

export async function getImgWidthAndHeightDuringBuild(
  imageUrl: string
): Promise<{ width: number; height: number }> {
  try {
    const goodUrl = nextImageUrl(imageUrl, 16);
    const response = await limit(async () => await fetch(goodUrl));
    // console.log(goodUrl);

    if (!response.ok) {
      console.error(
        `Failed to fetch image: ${goodUrl} ${response.status} ${response.statusText}`
      );
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    if (!response.body) {
      console.error("Response body is null");
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    // Convert the response body to a Buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { width, height } = sizeOf(buffer);
    if (!width || !height) throw new Error("Failed to get image dimensions");
    return { width, height };
  } catch (error) {
    console.error(`Error getting image dimensions: ${error}`);
    throw error;
  }
}
