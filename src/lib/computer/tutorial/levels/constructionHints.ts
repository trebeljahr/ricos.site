import type { LevelHint } from "../types";

/**
 * Reveal reasoning first, only when the learner requests it. The last hint comes
 * last whatever its place in the arguments: one plain sentence with the idea of
 * the wiring, never a list of every connection.
 */
export function constructionHints(
  core: string,
  first: string,
  last: string,
  experiment: string,
): LevelHint[] {
  return [
    { title: "Core idea", text: core },
    { title: "First step", text: first },
    { title: "Try it", text: experiment },
    { title: "Last hint", text: last },
  ];
}
