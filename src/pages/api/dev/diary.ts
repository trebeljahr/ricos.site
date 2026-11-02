/**
 * Dev-only endpoint behind the buttons on /dev/diary: records that today's
 * entry was read or skipped, or takes that back. The record lives in
 * Notes/texts/diary-progress.json (see diaryStore.ts). It never reads the
 * texts themselves; the page sends the word count along.
 *
 * 404s in production and for any request from another machine.
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { dayKey } from "src/lib/computerSeries";
import { addEvent, DIARY_LOG_FILE, undoToday } from "src/lib/diary";
import { clientAddresses, readLog, servesPrivateNotes, writeLog } from "src/lib/diaryStore";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV !== "development") {
    res.status(404).json({ error: "Not available" });
    return;
  }
  if (!servesPrivateNotes(process.env, clientAddresses(req))) {
    res.status(404).json({ error: "Not available" });
    return;
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const { id, action, words } = (req.body ?? {}) as {
    id?: unknown;
    action?: unknown;
    words?: unknown;
  };
  const valid =
    typeof id === "string" &&
    id.length > 0 &&
    (action === "read" || action === "skip" || action === "undo") &&
    (action === "undo" || (typeof words === "number" && Number.isFinite(words) && words >= 0));
  if (!valid) {
    res.status(400).json({ error: 'Send { id, action: "read" | "skip" | "undo", words }' });
    return;
  }
  const today = dayKey(new Date());
  const log = readLog();
  const next =
    action === "undo"
      ? undoToday(log, id, today)
      : addEvent(undoToday(log, id, today), { day: today, id, action, words: Number(words) });
  try {
    writeLog(next);
  } catch (error) {
    res.status(500).json({ error: `Could not save ${DIARY_LOG_FILE}: ${String(error)}` });
    return;
  }
  res.status(200).json({ ok: true });
}
