import { OpenGraph } from "./OpenGraph";
import { TailwindNavbar } from "./Navbar/TailwindNavbar";
import { ReactNode } from "react";
import { toTitleCase } from "src/lib/utils";
import { Meta } from "./Meta";

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
    <div className="block relative w-full p-0 m-0">
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

      <div
        className={
          fullScreen
            ? "w-full mx-auto max-w-full"
            : "w-full mx-auto max-w-5xl overflow-x-clip"
        }
      >
        {children}
      </div>
    </div>
  );
};

export default Layout;
