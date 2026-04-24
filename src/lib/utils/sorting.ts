import type { HasDate } from "src/@types";

export const byDate = (a: HasDate, b: HasDate) => (new Date(a.date) > new Date(b.date) ? -1 : 1);

export const byReadingTime = (
  a: { metadata?: { readingTime?: number } },
  b: { metadata?: { readingTime?: number } },
) => {
  const aTime = a.metadata?.readingTime || 0;
  const bTime = b.metadata?.readingTime || 0;

  return bTime - aTime;
};
