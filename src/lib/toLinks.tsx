import Link from "next/link";
import { turnKebabIntoTitleCase } from "./utils/turnKebapIntoTitleCase";

export const toLinks = (url: string) => (
  <Link key={url} href={url}>
    {turnKebabIntoTitleCase(url)}
  </Link>
);

export const toLinksFromNameUrlTuples = ({
  url,
  name,
}: {
  url: string;
  name: string;
}) => (
  <Link key={url} href={url}>
    {turnKebabIntoTitleCase(name)}
  </Link>
);
