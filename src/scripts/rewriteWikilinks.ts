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

const directoryPath = path.join(process.cwd(), "src/content/Notes");

const wikiLinkRegex = /!\[\[([^\]]+)\]\]/g;

function processDirectory(directoryPath: string) {
  const files = fs.readdirSync(directoryPath);

  files.forEach((fileName) => {
    const filePath = path.join(directoryPath, fileName);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      processDirectory(filePath);
    } else if (path.extname(fileName) === ".md") {
      const sourceName = fileName.replace(".md", "");

      let fileContents = fs.readFileSync(filePath, "utf8");

      const basePath = path.join(process.cwd(), "src/content/Notes");

      fileContents = fileContents.replace(wikiLinkRegex, (_, p1) => {
        const linkText = capitalizeWords(
          wordsToCapitalize,
          path.parse(p1.replace(/-/g, " ")).name
        );
        const parentFolder = path.basename(directoryPath);

        console.info({ p1 });

        const currentLinkPath = path.resolve("/assets", p1);
        const absoluteCurrentLinkPath = path.join(basePath, currentLinkPath);

        const linkDestinationPath = path.join(
          "/assets",
          parentFolder,
          sourceName,
          p1
        );
        const absoluteLinkDestinationPath = path.join(
          basePath,
          linkDestinationPath
        );
        const replacementText = `![${linkText}](${linkDestinationPath})`;

        try {
          fs.mkdirSync(path.dirname(absoluteLinkDestinationPath), {
            recursive: true,
          });
          fs.copyFileSync(absoluteCurrentLinkPath, absoluteLinkDestinationPath);
          fs.rmSync(absoluteCurrentLinkPath);
        } catch (error) {
          console.info("------------------ ERROR ------------------");
          console.info(error);

          console.info(replacementText);
          console.info(absoluteCurrentLinkPath);
          console.info(absoluteLinkDestinationPath);
        }

        return replacementText;
      });

      fs.writeFileSync(filePath, fileContents);
    }
  });
}

processDirectory(directoryPath);
