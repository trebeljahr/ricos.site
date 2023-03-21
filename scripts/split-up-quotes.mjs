import { readFile, writeFile } from "fs/promises";

const quoteText = await readFile("./quote-text.md", "utf-8");
const quotes = quoteText
  .split("\n")
  .map((str) => str.trim())
  .filter((str) => str.length > 0);

const allQuotes = [];
for (let i = 0; i < quotes.length; i += 2) {
  const author = quotes[i + 1].replace("– ", "");
  const newQuote = { author, content: quotes[i].replace("> ", ""), tags: [] };
  allQuotes.push(newQuote);
}

await writeFile("./quotes.json", JSON.stringify(allQuotes, undefined, 2));
