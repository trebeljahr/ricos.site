import { OpenGraph } from "./OpenGraph";
import { TailwindNavbar } from "./Navbar/TailwindNavbar";
import { ReactNode } from "react";
import { toTitleCase } from "src/lib/utils";
import { Meta } from "./Meta";
import clsx from "clsx";

type Props = {
  children: ReactNode;
  description: string;
  title: string;
  url: string;
  keywords: string[];
  image: string;
  imageAlt: string;
  fullScreen?: boolean;
  withProgressBar?: boolean;
};

const Layout = ({
  children,
  description,
  title,
  url,
  image,
  keywords,
  imageAlt,
  fullScreen = false,
  withProgressBar = false,
}: Props) => {
  const properTitle = toTitleCase(title);

  return (
    <div className="block relative w-full p-0 m-0 min-h-fit overflow-visible">
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
      <TailwindNavbar withProgressBar={withProgressBar} />

      {children}
    </div>
  );
};

export default Layout;
