import { toTitleCase } from "src/lib/toTitleCase";
import Meta from "./meta";
import { OpenGraph } from "./OpenGraph";
import { TailwindNavbar } from "./tailwindui-navbar";

type Props = {
  children: React.ReactNode;
  description: string;
  title: string;
  url?: string;
  image?: string;
  imageAlt?: string;
  fullScreen?: boolean;
};

const Layout = ({
  children,
  description,
  title,
  url,
  image,
  imageAlt,
  fullScreen = false,
}: Props) => {
  const properTitle = toTitleCase(title);

  return (
    <>
      <Meta description={description} title={properTitle} />
      <OpenGraph
        title={properTitle}
        description={description}
        url={url}
        image={image}
        imageAlt={imageAlt}
      />
      <TailwindNavbar />

      <main
        className={
          fullScreen ? "w-100 pr-3 pl-3 mt-10 md:pr-10 md:pl-10" : "main-page"
        }
      >
        {children}
      </main>
    </>
  );
};

export default Layout;
