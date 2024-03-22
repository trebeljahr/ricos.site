import fs from "fs";
import path from "path";
import matter from "gray-matter";
import * as glob from "glob";
import { Note } from "@contentlayer/generated";
import { execSync } from "child_process";

const directory = "src/content/Notes";

const fields = {
  title: "Enter title",
  subtitle: "Enter subtitle",
  excerpt: "Enter excerpt",
  dateUpdated: new Date().toISOString().slice(0, 10),
  dateCreated: new Date().toISOString().slice(0, 10),
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

function getUpdatedDate(filePath: string): string {
  const directory = path.dirname(filePath);
  const filename = path.basename(filePath);
  const command = `git log --format=%aD -1 -- "${filename}"`;
  const result = execSync(command, { cwd: directory }).toString().trim();
  return result;
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
    frontmatter.date || frontmatter.date_published || getCreationDate(filePath);
  const dateUpdated = frontmatter.date_updated || getUpdatedDate(filePath);

  // If no front matter exists, add the new fields
  const newFrontmatter = {
    ...fields,
    ...frontmatter,
    title: fileName,
    dateCreated,
    dateUpdated,
  };

  delete newFrontmatter["coverImage"];
  delete newFrontmatter["ogImage"];
  delete newFrontmatter["author"];
  delete newFrontmatter["date_published"];
  delete newFrontmatter["date_updated"];
  delete newFrontmatter["date"];

  const newContent = matter.stringify(content, newFrontmatter);

  console.log(newFrontmatter);
  console.log("-----");

  // Write the updated content back to the file
  // fs.writeFileSync(filePath, newContent, "utf8");
});
