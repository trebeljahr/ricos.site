// import Footer from "./footer";
import Meta from "./meta";
import { Navbar } from "./navbar";

type Props = {
  children: React.ReactNode;
  description: string;
  title: string;
};

const Layout = ({ children, description, title }: Props) => {
  return (
    <>
      <Meta description={description} title={title} />
      <Navbar />
      <main className={"main-page"}>{children}</main>
    </>
  );
};

export default Layout;
