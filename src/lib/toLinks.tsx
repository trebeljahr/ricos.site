import { ImageWithLoader } from "@components/ImageWithLoader";
import Link from "next/link";
import { turnKebabIntoTitleCase } from "./utils/turnKebapIntoTitleCase";

export const toLinks = (url: string) => (
  <Link key={url} href={url}>
    {turnKebabIntoTitleCase(url)}
  </Link>
);

// Preview PNGs live flat under /assets/pages/ for most categories, but
// controllers + dungeon scenes were organized under /assets/pages/r3f/.
// Pick the folder based on the route so nav previews don't 404.
const NESTED_PREFIXES = ["/r3f/controllers/", "/r3f/dungeon/"];
const previewSrc = (name: string, url: string) =>
  NESTED_PREFIXES.some((p) => url.startsWith(p))
    ? `/assets/pages/r3f/${name}.png`
    : `/assets/pages/${name}.png`;

export const toLinksFromNameUrlTuples = ({
  url,
  name,
}: {
  url: string;
  name: string;
}) => (
  <Link key={url} href={url}>
    <div className="mb-5 cursor-pointer duration-200 hover:transform hover:scale-105">
      <ImageWithLoader
        src={previewSrc(name, url)}
        alt={name}
        width={200}
        height={100}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
      {turnKebabIntoTitleCase(name)}
    </div>
  </Link>
);
