// Which resources of the "how computers work" study plan are done, kept in
// .study-progress.json next to .writing-progress.json and gitignored like it:
// what Rico has watched is his own progress, not part of the site. Server-only
// (node:fs); /dev/writing reads it and /api/dev/study writes it.

import fs from "node:fs";
import type { StudyDone } from "./computerSeriesResources";

export const STUDY_FILE = ".study-progress.json";

export function readStudyDone(): StudyDone {
  try {
    return JSON.parse(fs.readFileSync(STUDY_FILE, "utf8")) as StudyDone;
  } catch {
    return {};
  }
}

export function writeStudyDone(done: StudyDone): void {
  fs.writeFileSync(STUDY_FILE, `${JSON.stringify(done, undefined, 2)}\n`);
}
