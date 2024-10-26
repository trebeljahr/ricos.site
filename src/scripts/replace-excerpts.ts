import fs from "fs-extra";
import path from "path";
import matter from "gray-matter";

const markdownDirectory = path.join(
  process.cwd(),
  "src/content/Notes/booknotes"
);

async function processMarkdownFiles(directory: string) {
  const files = await fs.readdir(directory);

  for (const file of files) {
    const filePath = path.join(directory, file);

    // Process only .md files
    if (path.extname(file) === ".md") {
      const fileContents = await fs.readFile(filePath, "utf-8");

      // Parse the frontmatter and content using gray-matter
      const { content, data } = matter(fileContents);

      // Check if the frontmatter has an "excerpt" key
      if (data.excerpt) {
        const excerptContent = data.excerpt.trim(); // Extract and trim excerpt content
        // Remove the "excerpt" key from the frontmatter
        delete data.excerpt;

        // Rebuild the file without the "excerpt" in the frontmatter
        const updatedMarkdown = matter.stringify(content, data);

        // Replace <p>{frontmatter.excerpt}</p> with the extracted excerpt content
        const newContent = updatedMarkdown.replace(
          "<p>{frontmatter.excerpt}</p>",
          excerptContent
        );

        // Write the updated content back to the file
        await fs.writeFile(filePath, newContent, "utf-8");

        console.log(`Processed and updated file: ${filePath}`, excerptContent);
      }
    }
  }
}

// Run the script
processMarkdownFiles(markdownDirectory).catch((err) => {
  console.error("Error processing markdown files:", err);
});
