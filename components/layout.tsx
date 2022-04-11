// import Footer from "./footer";
import Meta from "./meta";
import { Navbar } from "./navbar";

type Props = {
  children: React.ReactNode;
  description?: string;
  pageTitle?: string;
  trebeljahr?: boolean;
  fullPage?: boolean;
};

const Layout = ({
  children,
  description,
  trebeljahr: intro,
  pageTitle,
  fullPage: full = false,
}: Props) => {
  return (
    <>
      <Meta description={description} title={pageTitle} />
      <Navbar intro={intro} />
      <main className={full ? "main-page-full" : "main-page"}>{children}</main>
      {/* <Footer /> */}
    </>
  );
};

export default Layout;
