// import Footer from "./footer";
import Meta from "./meta";
import { Navbar } from "./navbar";

type Props = {
  children: React.ReactNode;
  description: string;
  pageTitle: string;
};

const Layout = ({ children, description, pageTitle }: Props) => {
  return (
    <>
      <Meta description={description} title={pageTitle} />
      <Navbar />
      <main className={"main-page"}>{children}</main>
    </>
  );
};

export default Layout;
