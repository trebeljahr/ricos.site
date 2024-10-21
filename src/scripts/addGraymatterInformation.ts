import { execSync } from "child_process";
import fs from "fs";
import * as glob from "glob";
import matter from "gray-matter";
import path from "path";

const directory = "src/content/Notes/booknotes";

const booknotesFields = {
  title: "",
  bookCover: "/assets/book-covers/",
  bookAuthor: "",
  excerpt: "",
  date: "01.01.1970",
  rating: 0,

  published: false,
  done: false,
  tags: [],
  summary: false,
  detailedNotes: false,
  amazonLink: "",
  amazonAffiliateLink: "",
};

function parseBookTitle(fileName: string) {
  const [title, bookAuthor] = fileName.split(/ - | – /);
  return { title, bookAuthor };
}

const mdFiles = glob.sync(path.join(directory, "**/*.md"));

function parseDateFromTitle(title: string) {
  const match = title.match(/^\d{2}[-.]\d{2}[-.]\d{4}/);

  if (match) {
    const dateString = match[0].replace(/-/g, ".");
    const dateParts = dateString.split(".");
    const dateISO = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
    const parsedDate = new Date(dateISO);

    if (isNaN(parsedDate.getTime())) {
      return false;
    }
    return parsedDate.toISOString().slice(0, 10);
  } else {
    return false;
  }
}

function getCreationDate(filePath: string): string {
  const directory = path.dirname(filePath);
  const filename = path.basename(filePath);

  const command = `git log --diff-filter=A --follow --format=%aD -1 -- "${filename}"`;
  const result = execSync(command, { cwd: directory }).toString().trim();
  return result;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

mdFiles.forEach((filePath: string) => {
  const fileContent = fs.readFileSync(filePath, "utf8");
  const fileName = path.basename(filePath, ".md");
  const { data: frontmatter, content } = matter(fileContent);

  const parsedCreationDate =
    parseDateFromTitle(fileName) || getCreationDate(filePath);

  const { title, bookAuthor } = parseBookTitle(fileName);
  const newFrontmatter = {
    ...booknotesFields,
    title,
    bookAuthor,
    date: frontmatter.date || formatDate(parsedCreationDate),
    ...frontmatter,
  } as { [key: string]: any };

  delete newFrontmatter["draft"];

  const newContent = matter.stringify(content, newFrontmatter);
  fs.writeFileSync(filePath, newContent, "utf8");
});
