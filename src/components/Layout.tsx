import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { toTitleCase } from "src/lib/utils/toTitleCase";
import { Meta } from "./Meta";
import { TailwindNavbar } from "./Navbar/TailwindNavbar";
import { OpenGraph } from "./OpenGraph";
import { SiteFooter } from "./SiteFooter";

// LeftSmallNavbar pulls motion/react for slide-in animations; load it
// only on pages that actually opt in via the leftSmallNavbar prop.
const LeftSmallNavbar = dynamic(() =>
  import("./Navbar/LeftSmallNavbar").then((m) => m.LeftSmallNavbar),
);

type Props = {
  children: ReactNode;
  description: string;
  title: string;
  url: string;
  keywords: string[];
  /** Cover image for the share card. Omit to fall back to the site-wide default. */
  image?: string;
  imageAlt?: string;
  /** Intrinsic dimensions of `image`, used to emit an accurate og:image:height. */
  imageWidth?: number;
  imageHeight?: number;
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
  imageWidth,
  imageHeight,
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
        imageWidth={imageWidth}
        imageHeight={imageHeight}
        ogType={ogType}
        articlePublishedTime={articlePublishedTime}
      />
      {leftSmallNavbar ? <LeftSmallNavbar /> : <TailwindNavbar withProgressBar={withProgressBar} />}

      {children}
      <SiteFooter />
    </div>
  );
};

export default Layout;
