import * as fs from "node:fs";
import * as path from "node:path";
import matter from "gray-matter";

function parseBookTitle(fileName: string): { title: string; author: string } {
  const [title, author] = fileName.split(/ - | – /);
  return { title, author };
}

// biome-ignore lint/correctness/noUnusedVariables: kept for future use
function renameFilesInDirectory(directory: string): void {
  const files = fs.readdirSync(directory);

  for (const file of files) {
    const filePath = path.join(directory, file);
    if (fs.lstatSync(filePath).isFile()) {
      const { title } = parseBookTitle(file);
      const newFileName = title.toLowerCase().replace(/ /g, "-") + path.extname(file);
      const newFilePath = path.join(directory, newFileName);
      fs.renameSync(filePath, newFilePath);
      console.info(`Renamed: ${file} -> ${newFileName}`);
    }
  }
}

const isValidBookCover = (bookCover: string): boolean => {
  return bookCover.endsWith(".jpg");
};

const updateBookCoverField = (filePath: string, fileName: string) => {
  const fileContent = fs.readFileSync(filePath, "utf8");
  const parsedContent = matter(fileContent);

  if (!isValidBookCover(parsedContent.data.bookCover)) {
    parsedContent.data.bookCover = `/assets/book-covers/${fileName}.jpg`;
    const updatedContent = matter.stringify(parsedContent.content, parsedContent.data);
    fs.writeFileSync(filePath, updatedContent, "utf8");
    console.info(`Updated bookCover for file: ${fileName}`);
  }
};

const directoryPath = "src/content/Notes/booknotes";

fs.readdir(directoryPath, (err, files) => {
  if (err) {
    return console.error("Unable to scan directory: " + err);
  }

  for (const file of files) {
    const filePath = path.join(directoryPath, file);
    const fileExtension = path.extname(file);

    if (fileExtension === ".md") {
      const fileName = path.basename(file, fileExtension);
      updateBookCoverField(filePath, fileName);
    }
  }
});
