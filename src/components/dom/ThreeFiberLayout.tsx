import { PropsWithChildren, ReactNode } from "react";
import { NavbarR3F } from "./NavbarR3F";
import { nav } from "@r3f/ChunkGenerationSystem/config";
import { Meta } from "@components/Meta";
import { OpenGraph } from "@components/OpenGraph";
import { toTitleCase } from "src/lib/utils/toTitleCase";

type Props = {
  description: string;
  title: string;
  url: string;
  keywords: string[];
  image: string;
  imageAlt: string;
};

export const ThreeFiberLayout = ({
  children,
  description,
  title,
  url,
  image,
  keywords,
  imageAlt,
}: PropsWithChildren<Props>) => {
  const properTitle = toTitleCase(title) + " | Rico's R3F Playground";

  return (
    <div className="overscroll-none">
      <Meta
        description={description}
        title={properTitle}
        url={url}
        keywords={keywords}
      />
      <OpenGraph
        title={properTitle}
        description={description}
        url={url}
        image={image}
        imageAlt={imageAlt}
      />
      {nav && <NavbarR3F />}
      <div className="w-full h-screen">{children}</div>
    </div>
  );
};
