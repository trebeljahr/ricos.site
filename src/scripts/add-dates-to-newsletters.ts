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
  "newsletter-stuff",
  "newsletters"
);
const files = fs
  .readdirSync(newslettersDir)
  .filter((file: string) => file.match(/^\d+\.md$/));

// Sort files by their numeric value
files.sort((a: string, b: string) => parseInt(a) - parseInt(b));

// Calculate the date for the latest newsletter (assuming it's released on the last Sunday)
const latestEditionNumber = 46;
const today = new Date();
const lastSunday = today.getDate() - today.getDay();
const latestEditionDate = new Date(today.setDate(lastSunday));

files.forEach((file: string) => {
  const filePath = path.join(newslettersDir, file);
  const fileContent = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(fileContent);

  // Calculate the publication date for this edition
  const publicationDate = subWeeks(
    latestEditionDate,
    (latestEditionNumber - parseInt(file, 10)) * 2
  );
  const formattedDate = format(publicationDate, "yyyy-MM-dd");

  // Update the frontmatter
  const newData = { ...data, date: formattedDate };
  const newContent = matter.stringify(content, newData);

  // Write the file back
  fs.writeFileSync(filePath, newContent);
  console.log(`Updated ${file} with date ${formattedDate}`);
});
