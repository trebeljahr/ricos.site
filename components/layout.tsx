// import Footer from "./footer";
import Meta from "./meta";
import { Navbar } from "./navbar";

type Props = {
  children: React.ReactNode;
  description?: string;
  navHeaderWithLink?: boolean;
  navHeaderMotto?: boolean;
};

const Layout = ({
  children,
  description,
  navHeaderWithLink,
  navHeaderMotto: navHeaderWithMotto,
}: Props) => {
  return (
    <div className="main-page">
      <Navbar withLink={navHeaderWithLink} withMotto={navHeaderWithMotto} />
      <Meta description={description} />
      <main className="post-body">{children}</main>
      {/* <Footer /> */}
    </div>
  );
};

export default Layout;
