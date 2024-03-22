import { execSync } from "child_process";
import fs from "fs";
import * as glob from "glob";
import matter from "gray-matter";
import path from "path";

function generateExcerpt(text: string, length: number): string {
  const lines = text
    .split("\n")
    .filter((line) => !/^#/.test(line.trim()) || line === "");
  const parts = lines.join(" ").split(/([.,!?])\s*/);
  let excerpt = "";

  for (let i = 0; i < parts.length - 1; i += 2) {
    const sentence = parts[i] + parts[i + 1];
    if (excerpt.length + sentence.length <= length) {
      excerpt += sentence + " ";
    } else {
      break;
    }
  }

  return excerpt.trim().slice(0, -1) + "...";
}

const directory = "src/content/Notes";

const fields = {
  title: "Enter title",
  subtitle: "Enter subtitle",
  excerpt: "Enter excerpt",
  date: "01.01.1970",
  tags: [],
  cover: {
    src: "Enter Cover image source",
    alt: "Enter Cover image alt text",
    width: 500,
    height: 500,
  },
  draft: true,
};

const mdFiles = glob.sync(path.join(directory, "**/*.md"));
console.log(mdFiles);

function parseDateFromTitle(title: string) {
  const match = title.match(/^\d{2}[-.]\d{2}[-.]\d{4}/);

  if (match) {
    const dateString = match[0].replace(/-/g, ".");
    const dateParts = dateString.split(".");
    const dateISO = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
    const parsedDate = new Date(dateISO);

    console.log(title, match[0], parsedDate);

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
  // console.log(filename);
  // console.log(result);
  // console.log("-----");
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
  const { data: frontmatter, content } = matter(fileContent) as unknown as {
    data: typeof fields;
    content: string;
  };

  const parsedCreationDate =
    parseDateFromTitle(fileName) || getCreationDate(filePath);

  console.log(frontmatter.date);

  const extractedExcerpt = generateExcerpt(content, 250);
  const excerpt =
    frontmatter.excerpt !== "Enter excerpt"
      ? frontmatter.excerpt
      : extractedExcerpt || fields.excerpt;

  console.log(extractedExcerpt);

  const newFrontmatter = {
    ...fields,
    ...frontmatter,
    excerpt,
    draft: true,
    title: fileName,
    date: frontmatter.date || formatDate(parsedCreationDate),
  };

  const newContent = matter.stringify(content, newFrontmatter);
  fs.writeFileSync(filePath, newContent, "utf8");
});
