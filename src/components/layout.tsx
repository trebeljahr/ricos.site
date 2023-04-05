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
};

const Layout = ({ children, description, title, url, image }: Props) => {
  return (
    <>
      <Meta description={description} title={title} />
      <OpenGraph
        title={title}
        description={description}
        url={url}
        image={image}
      />
      <Navbar />
      <main className={"main-page"}>{children}</main>
    </>
  );
};

export default Layout;
