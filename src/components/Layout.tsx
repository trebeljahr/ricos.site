import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { toTitleCase } from "src/lib/utils/toTitleCase";
import { Meta } from "./Meta";
import { TailwindNavbar } from "./Navbar/TailwindNavbar";
import { OpenGraph } from "./OpenGraph";
import { SiteFooter } from "./SiteFooter";

// Load LeftSmallNavbar only on pages that opt in via the leftSmallNavbar prop.
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
  /** Section-specific nav next to the logo in the site navbar. */
  navbarSecondary?: ReactNode;
  ogType?: "website" | "article";
  articlePublishedTime?: string;
  noindex?: boolean;
  /** Load katex.min.css for this page only. Set from the content's hasMath. */
  hasMath?: boolean;
  /** For pages with less on them than fills a window. The page grows to take
      up whatever room is left over, so the footer sits at the bottom of the
      window rather than partway up it with the background showing below. */
  fillViewport?: boolean;
  /** Project donation pages provide their own navigation and footer. */
  siteChrome?: boolean;
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
  navbarSecondary,
  ogType = "website",
  articlePublishedTime,
  noindex = false,
  hasMath = false,
  fillViewport = false,
  siteChrome = true,
}: Props) => {
  const properTitle = toTitleCase(title);

  return (
    <div
      className={
        fillViewport
          ? "relative m-0 flex min-h-svh w-full flex-col overflow-visible p-0 [&>main]:flex-1"
          : "block relative w-full p-0 m-0 min-h-fit overflow-visible"
      }
    >
      <Meta
        description={description}
        title={properTitle}
        url={url}
        keywords={keywords}
        noindex={noindex}
        hasMath={hasMath}
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
      {siteChrome &&
        (leftSmallNavbar ? (
          <LeftSmallNavbar />
        ) : (
          <TailwindNavbar withProgressBar={withProgressBar} secondary={navbarSecondary} />
        ))}

      {children}
      {siteChrome && <SiteFooter />}
    </div>
  );
};

export default Layout;
