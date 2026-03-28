import { readFile } from "fs/promises";
import path from "path";

export async function generateRedirects() {
  const veliteOutput = path.join(
    path.resolve(path.dirname("")),
    ".velite",
    "newsletters.json"
  );
  const newsletters = JSON.parse(await readFile(veliteOutput, "utf-8"));

  return newsletters.map(({ number, slugTitle }) => ({
    source: `/newsletters/${number}`,
    destination: `/newsletters/${slugTitle}`,
    permanent: true,
  }));
}
