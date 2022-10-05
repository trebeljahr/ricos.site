import matter from "gray-matter";
import fs from "fs/promises";
import { join } from "path";

export function getStaticPropsGetter(pageName: string) {
  const content = join(process.cwd(), "src", "content");
  const path = join(content, "pages", pageName);

  return async () => {
    const fileContents = await fs.readFile(path, "utf-8");
    const {
      data: { description, title, subtitle },
      content,
    } = matter(fileContents);

    return {
      props: { content, description, title, subtitle },
    };
  };
}
