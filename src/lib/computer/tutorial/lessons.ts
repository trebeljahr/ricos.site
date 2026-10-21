import { CATALOG, LEVELS, sections } from "./levels";

/** The builder and chapter demos use the same lesson ids and progress store. */
export const BUILDER_LESSONS = LEVELS.filter(
  (level) =>
    !level.practice ||
    level.practice.core ||
    LEVELS.filter((other) => other.practice?.family === level.practice?.family).length === 1,
);
export const BUILDER_LESSON_IDS = BUILDER_LESSONS.map((level) => level.id);
export const LESSON_SECTIONS = sections(BUILDER_LESSONS);

const PRESET_LESSONS: Record<string, string> = {
  "8-bit shared bus": "shared-bus",
  "Clocked memory": "d-flip-flop",
};

export function lessonForCircuit(name: string): string | undefined {
  return (
    PRESET_LESSONS[name] ??
    CATALOG.parts.get(CATALOG.presetParts.get(name) ?? "")?.level.id ??
    BUILDER_LESSONS.find((level) => level.title.toLowerCase() === name.toLowerCase())?.id
  );
}
