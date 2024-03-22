import fs from "fs";
import path, { format } from "path";
import matter from "gray-matter";
import * as glob from "glob";
import { Note } from "@contentlayer/generated";
import { execSync } from "child_process";

const directory = "src/content/Notes";

const fields = {
  title: "Enter title",
  subtitle: "Enter subtitle",
  excerpt: "Enter excerpt",
  tags: [],
  cover: {
    src: "Enter Cover image source",
    alt: "Enter Cover image alt text",
    width: 500,
    height: 500,
  },
  draft: false,
};

const mdFiles = glob.sync(path.join(directory, "**/*.md"));
console.log(mdFiles);

function parseDateFromTitle(title: string) {
  const match = title.match(/^\d{2}[-.]\d{2}[-.]\d{4}/);

  if (match) {
    // Replace dashes with dots to ensure consistent date format
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

  // console.log(creationDate);

  // Extract the title from the filename
  const fileName = path.basename(filePath, ".md");

  // Parse the file content and check if front matter already exists
  const { data: frontmatter, content } = matter(fileContent) as unknown as {
    data: Note;
    content: string;
  };

  const dateCreated =
    parseDateFromTitle(fileName) ||
    frontmatter.date ||
    frontmatter.date_published ||
    getCreationDate(filePath);

  const newFrontmatter = {
    ...fields,
    ...frontmatter,
    title: fileName,
    date: formatDate(dateCreated),
  };

  if (newFrontmatter.date === "Invalid Date") {
    // console.log(dateCreated);
  }

  delete newFrontmatter["coverImage"];
  delete newFrontmatter["ogImage"];
  delete newFrontmatter["author"];
  delete newFrontmatter["date_published"];
  delete newFrontmatter["date_updated"];

  const newContent = matter.stringify(content, newFrontmatter);

  // console.log(newFrontmatter);
  // console.log("-----");

  // Write the updated content back to the file
  fs.writeFileSync(filePath, newContent, "utf8");
});
