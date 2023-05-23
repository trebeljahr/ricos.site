// import Footer from "./footer";
import Meta from "./meta";
import { Navbar } from "./navbar";
import { OpenGraph } from "./OpenGraph";

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
  return (
    <>
      <Meta description={description} title={title} />
      <OpenGraph
        title={title}
        description={description}
        url={url}
        image={image}
        imageAlt={imageAlt}
      />
      <Navbar />
      <main
        className={fullScreen ? "w-100 p-1 md:pr-10 md:pl-10" : "main-page"}
      >
        {children}
      </main>
    </>
  );
};

export default Layout;
