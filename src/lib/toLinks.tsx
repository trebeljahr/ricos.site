import Link from "next/link";
import { turnKebabIntoTitleCase } from "./utils/turnKebapIntoTitleCase";
import { ImageWithLoader } from "@components/ImageWithLoader";

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
    <div className="mb-5 cursor-pointer duration-200 hover:transform hover:scale-105">
      <ImageWithLoader
        src={`/assets/pages/${name}.png`}
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
