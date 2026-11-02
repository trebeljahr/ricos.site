import type { ComputerChapter } from "@velite";

/**
 * The series' public demos stay out of search until the first chapter is out,
 * like /computer itself, so that a demo is not the series' first impression.
 * Publishing a chapter lifts it on the next build.
 */
export async function getSeriesStatusProps() {
  const { loadVeliteData } = await import("src/lib/loadVeliteData");
  const chapters = loadVeliteData<ComputerChapter[]>("computerChapters.json");
  return { props: { seriesIsOut: chapters.some((chapter) => chapter.published) } };
}
