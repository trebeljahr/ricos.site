import fs from "fs";
import path from "path";

function capitalizeWords(wordsToCapitalize: string[], str: string): string {
  const words = str.split(" ");

  const updatedWords = words.map((word) => {
    if (wordsToCapitalize.includes(word)) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    }
    return word;
  });

  return updatedWords.join(" ");
}

const wordsToCapitalize = [
  "rebecca",
  "christian",
  "guadeloupe",
  "soufriere",
  "carbet",
  "cisterne",
  "i",
  "io",
  "nathalies",
  "nathalie",
  "cape",
  "verde",
  "tarpan",
  "decouverte",
  "abri",
  "morne",
  "leger",
];

const directoryPath = path.join(process.cwd(), "src/content/Notes/travel");

const wikiLinkRegex = /!\[\[([^\]]+)\]\]/g;

function processDirectory(directoryPath: string) {
  const files = fs.readdirSync(directoryPath);

  files.forEach((fileName) => {
    const filePath = path.join(directoryPath, fileName);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      processDirectory(filePath);
    } else if (path.extname(fileName) === ".md") {
      let fileContents = fs.readFileSync(filePath, "utf8");

      fileContents = fileContents.replace(wikiLinkRegex, (_, p1) => {
        const linkText = capitalizeWords(
          wordsToCapitalize,
          path.parse(p1.replace(/-/g, " ")).name
        );
        const parentFolder = path.basename(directoryPath);
        const replacementText = `![${linkText}](/Attachments/Photography/${parentFolder}/${p1})`;
        console.log(replacementText);

        return replacementText;
      });

      fs.writeFileSync(filePath, fileContents);
    }
  });
}

processDirectory(directoryPath);
