import { toTitleCase } from "src/lib/toTitleCase";
import Meta from "./Meta";
import { OpenGraph } from "./OpenGraph";
import { TailwindNavbar } from "./Navbar/TailwindNavbar";
import { ReactNode } from "react";

type Props = {
  children: ReactNode;
  description: string;
  title: string;
  url?: string;
  image?: string;
  imageAlt?: string;
  fullScreen?: boolean;
  withProgressBar?: boolean;
};

const Layout = ({
  children,
  description,
  title,
  url,
  image,
  imageAlt,
  fullScreen = false,
  withProgressBar = false,
}: Props) => {
  const properTitle = toTitleCase(title);

  return (
    <div className="block relative w-full p-0 m-0">
      <Meta description={description} title={properTitle} />
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
            ? "w-full !max-w-full"
            : "w-full mx-auto xl:max-w-3xl overflow-x-clip"
        }
      >
        {children}
      </div>
    </div>
  );
};

export default Layout;
