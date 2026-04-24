import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const postsDirectory = path.join(process.cwd(), "src/content/Notes/travel/Crete");

const fileNames = fs.readdirSync(postsDirectory);

for (const fileName of fileNames) {
  const fullPath = path.join(postsDirectory, fileName);
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const matterResult = matter(fileContents);
  const newFileName = `${matterResult.data.title}.md`;
  fs.renameSync(fullPath, path.join(postsDirectory, newFileName));
}
