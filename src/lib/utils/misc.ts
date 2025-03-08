import { Travelblog } from "@velite";
import { nanoid } from "nanoid";
import { HasDate, ImageProps } from "src/@types";

export const toTitleCase = (str: string) =>
  str.slice(0, 1).toUpperCase() + str.slice(1);

export function turnKebabIntoTitleCase(kebab: string) {
  return kebab.split("-").map(toTitleCase).join(" ");
}

export const addIdAndIndex = (image: ImageProps, index: number) => {
  return {
    ...image,
    id: nanoid(),
    index,
  };
};

export const byDate = (a: HasDate, b: HasDate) =>
  new Date(a.date) > new Date(b.date) ? -1 : 1;

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}
export const byReadingTime = (
  a: { metadata?: { readingTime?: number } },
  b: { metadata?: { readingTime?: number } }
) => {
  const aTime = a.metadata?.readingTime || 0;
  const bTime = b.metadata?.readingTime || 0;

  return bTime - aTime;
};

export const lerp = (a: number, b: number, t: number) => a + t * (b - a);

export const inLerp = (a: number, b: number, v: number) => (v - a) / (b - a);

export const remap = (
  v: number,
  oMin: number,
  oMax: number,
  rMin: number,
  rMax: number
) => lerp(rMin, rMax, inLerp(oMin, oMax, v));
