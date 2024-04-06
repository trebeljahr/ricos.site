import fs from "fs";
import path from "path";
import matter from "gray-matter";

const postsDirectory = path.join(
  process.cwd(),
  "src/content/Notes/travel/Crete"
);
console.log(postsDirectory);

const fileNames = fs.readdirSync(postsDirectory);

// console.log(fileNames);

fileNames.forEach((fileName) => {
  const fullPath = path.join(postsDirectory, fileName);
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const matterResult = matter(fileContents);
  const newFileName = `${matterResult.data.title}.md`;
  console.log(fileName, newFileName);
  fs.renameSync(fullPath, path.join(postsDirectory, newFileName));
});
