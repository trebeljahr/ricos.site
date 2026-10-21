import type { LevelHint } from "../types";

/** Reveal reasoning before a wiring plan, only when the learner requests it. */
export function constructionHints(
  core: string,
  first: string,
  plan: string,
  experiment: string,
): LevelHint[] {
  return [
    { title: "Core idea", text: core },
    { title: "First step", text: first },
    { title: "Signal plan", text: plan },
    { title: "Try it", text: experiment },
  ];
}
