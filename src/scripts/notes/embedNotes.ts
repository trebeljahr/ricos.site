// Gives every new passage in private Notes its vector for meaning search on
// /dev/diary/desk. Needs Ollama running (`ollama serve`) with nomic-embed-text.
// Safe to rerun: passages it already knows cost nothing.

import { notesIndex } from "../../lib/notesStore";
import { updateVectors } from "../../lib/notesVectors";

const started = Date.now();
const { added, total } = await updateVectors(notesIndex(), (done, all) => {
  process.stdout.write(`\r${done} of ${all} new passages`);
});
const seconds = Math.round((Date.now() - started) / 1000);
console.log(`\n${added} added, ${total} passages have vectors, ${seconds}s.`);
