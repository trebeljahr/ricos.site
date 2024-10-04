import fs from "fs";
import path from "path";
import matter from "gray-matter";

const postsDirectory = path.join(
  process.cwd(),
  "src/content/Notes/travel/Crete"
);

const fileNames = fs.readdirSync(postsDirectory);

fileNames.forEach((fileName) => {
  const fullPath = path.join(postsDirectory, fileName);
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const matterResult = matter(fileContents);
  const newFileName = `${matterResult.data.title}.md`;
  fs.renameSync(fullPath, path.join(postsDirectory, newFileName));
});
