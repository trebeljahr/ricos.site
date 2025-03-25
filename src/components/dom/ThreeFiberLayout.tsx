import { PropsWithChildren, ReactNode } from "react";
import { NavbarR3F } from "./NavbarR3F";
import { nav } from "@r3f/ChunkGenerationSystem/config";
import { Meta } from "@components/Meta";
import { toTitleCase } from "src/lib/utils/misc";
import { OpenGraph } from "@components/OpenGraph";

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
  const properTitle = toTitleCase(title);

  return (
    <>
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
      <div className="w-screen h-screen">{children}</div>
    </>
  );
};
