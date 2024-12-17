import { createReadStream } from "node:fs";
import { imageDimensionsFromStream } from "image-dimensions";
import { nextImageUrl } from "src/lib/mapToImageProps";

export async function getWidthAndHeight(awsKey: string): Promise<{
  width: number;
  height: number;
  imagePath: string;
}> {
  try {
    const url = nextImageUrl(awsKey, 16);

    console.log("url: ", url);

    const { body } = await fetch(url);
    if (!body) throw new Error(`Failed to fetch image from ${url}`);

    const dimensions = await imageDimensionsFromStream(body);
    console.log(dimensions);

    const { width, height } = dimensions || {};

    if (!width || !height) throw new Error("Failed to get image dimensions");

    return { width, height, imagePath: awsKey };
  } catch (err) {
    console.error(`Error processing ${awsKey}: ${err}`);
    throw err;
  }
}
