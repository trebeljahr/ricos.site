import Link from "next/link";
import { turnKebabIntoTitleCase } from "./utils/misc";

export const toLinks = (url: string) => (
  <Link key={url} href={url}>
    {turnKebabIntoTitleCase(url)}
  </Link>
);
