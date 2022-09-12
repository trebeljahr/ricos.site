import { readFile, writeFile } from "fs/promises";

const quoteText = await readFile("../page-content/quotes.md", "utf-8");
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

await writeFile(
  "../page-content/quotes.json",
  JSON.stringify(allQuotes, undefined, 2)
);

console.log(quotes);
console.log(quotes.length / 2);
console.log(allQuotes);
