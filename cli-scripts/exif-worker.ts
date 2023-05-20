import { exiftool } from "exiftool-vendored";
import { readdir } from "fs/promises";
import path from "path";
import { expose } from "threads/worker";

expose(async function exifWorker(imagePath: string) {
  try {
    const tags = await exiftool.read(imagePath);
    const width = tags.ImageWidth;
    const height = tags.ImageHeight;

    // console.log(path.basename(imagePath), width, height);

    return { width, height, imagePath };
  } catch (err) {
    console.error(`Error processing ${imagePath}:`, err);
  }
  exiftool.end();
});
