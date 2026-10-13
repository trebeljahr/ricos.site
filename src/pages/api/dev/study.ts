/**
 * Dev-only endpoint behind the study checkboxes on /dev/writing: marks one
 * resource of the "how computers work" study plan as done, or clears the mark.
 * The record lives in .study-progress.json (see computerSeriesStudyStore.ts).
 *
 * 404s in production; there is no auth because it never exists there.
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { dayKey } from "src/lib/computerSeries";
import { setStudied } from "src/lib/computerSeriesResources";
import { readStudyDone, STUDY_FILE, writeStudyDone } from "src/lib/computerSeriesStudyStore";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV === "production") {
    res.status(404).json({ error: "Not available in production" });
    return;
  }
  if (req.method === "GET") {
    res.status(200).json({ done: readStudyDone() });
    return;
  }
  if (req.method === "POST") {
    const { id, done } = (req.body ?? {}) as { id?: unknown; done?: unknown };
    if (typeof id !== "string" || !id || typeof done !== "boolean") {
      res.status(400).json({ error: "Send { id: string, done: boolean }" });
      return;
    }
    const next = setStudied(readStudyDone(), id, done, dayKey(new Date()));
    try {
      writeStudyDone(next);
    } catch (error) {
      res.status(500).json({ error: `Could not save ${STUDY_FILE}: ${String(error)}` });
      return;
    }
    res.status(200).json({ done: next });
    return;
  }
  res.setHeader("Allow", "GET, POST");
  res.status(405).json({ error: "Method not allowed" });
}
