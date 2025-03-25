import { ReactNode } from "react";
import { Meta } from "./Meta";
import { LeftSmallNavbar, TailwindNavbar } from "./Navbar/TailwindNavbar";
import { OpenGraph } from "./OpenGraph";
import { toTitleCase } from "src/lib/utils/toTitleCase";

type Props = {
  children: ReactNode;
  description: string;
  title: string;
  url: string;
  keywords: string[];
  image: string;
  imageAlt: string;
  fullScreen?: boolean;
  leftSmallNavbar?: boolean;
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
  leftSmallNavbar = false,
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
      {leftSmallNavbar ? (
        <LeftSmallNavbar />
      ) : (
        <TailwindNavbar withProgressBar={withProgressBar} />
      )}

      {children}
    </div>
  );
};

export default Layout;
