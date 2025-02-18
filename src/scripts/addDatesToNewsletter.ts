import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { format, subWeeks } from "date-fns";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

const newslettersDir = path.join(
  __dirname,
  "..",
  "content",
  "Notes",
  "newsletters"
);
const files = fs
  .readdirSync(newslettersDir)
  .filter((file: string) => file.match(/^\d+\.md$/));

files.sort((a: string, b: string) => parseInt(a) - parseInt(b));

const latestEditionNumber = 46;
const today = new Date();
const lastSunday = today.getDate() - today.getDay();
const latestEditionDate = new Date(today.setDate(lastSunday));

files.forEach((file: string) => {
  const filePath = path.join(newslettersDir, file);
  const fileContent = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(fileContent);

  const publicationDate = subWeeks(
    latestEditionDate,
    (latestEditionNumber - parseInt(file, 10)) * 2
  );
  const formattedDate = format(publicationDate, "yyyy-MM-dd");

  const newData = { ...data, date: formattedDate };
  const newContent = matter.stringify(content, newData);

  fs.writeFileSync(filePath, newContent);
  console.info(`Updated ${file} with date ${formattedDate}`);
});
