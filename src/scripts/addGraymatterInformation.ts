import fs from "fs";
import path from "path";
import matter from "gray-matter";
import glob from "glob";

// Define the directory and the fields

const directory = "src/content/Notes";

const fields = {
  title: "Enter title",
  date: "Select date",
  date_published: "Select published date",
  date_updated: "Select updated date",
  subtitle: "Enter subtitle",
  tags: "Enter tags",
  excerpt: "Enter excerpt",
  coverImage: "Enter cover image URL",
  author: {
    name: "Enter author name",
    image: {
      src: "Enter image source",
      alt: "Enter image alt text",
      width: 0,
      height: 0,
    },
  },
  ogImage: {
    src: "Enter Open Graph image source",
    alt: "Enter Open Graph image alt text",
    width: 0,
    height: 0,
  },
  draft: false,
};

const mdFiles = glob.sync(path.join(directory, "**/*.md"));
console.log(mdFiles);

mdFiles.forEach((filePath: string) => {
  const fileContent = fs.readFileSync(filePath, "utf8");

  // Parse the file content and check if front matter already exists
  const { data: frontmatter, content } = matter(fileContent);
  // If no front matter exists, add the new fields
  const newFrontmatter = { ...fields, ...frontmatter };
  const newContent = matter.stringify(content, newFrontmatter);

  console.log(newContent);
  // Write the updated content back to the file
  // fs.writeFileSync(filePath, newContent, "utf8");
});
