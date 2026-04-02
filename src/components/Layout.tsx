import { ReactNode } from "react";
import { Meta } from "./Meta";
import { LeftSmallNavbar } from "./Navbar/LeftSmallNavbar";
import { TailwindNavbar } from "./Navbar/TailwindNavbar";
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
  ogType?: "website" | "article";
  articlePublishedTime?: string;
  noindex?: boolean;
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
  ogType = "website",
  articlePublishedTime,
  noindex = false,
}: Props) => {
  const properTitle = toTitleCase(title);

  return (
    <div className="block relative w-full p-0 m-0 min-h-fit overflow-visible">
      <Meta
        description={description}
        title={properTitle}
        url={url}
        keywords={keywords}
        noindex={noindex}
      />
      <OpenGraph
        title={properTitle}
        description={description}
        url={url}
        image={image}
        imageAlt={imageAlt}
        ogType={ogType}
        articlePublishedTime={articlePublishedTime}
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
