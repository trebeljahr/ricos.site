import fs from "fs/promises";
import { join } from "path";
import { getBySlug } from "./api";

export function getStaticPropsGetter(pageName: string) {
  return async () => {
    const dir = join(process.cwd(), "src", "content", "pages");
    const { content, description, title, subtitle } = await getBySlug(
      pageName,
      ["content", "description", "title", "subtitle"],
      dir
    );

    return {
      props: { content, description, title, subtitle },
    };
  };
}
