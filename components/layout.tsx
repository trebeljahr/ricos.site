// import Footer from "./footer";
import Meta from "./meta";

type Props = {
  children: React.ReactNode;
};

const Layout = ({ children }: Props) => {
  return (
    <div className="main-page">
      <Meta />
      <main>{children}</main>
      {/* <Footer /> */}
    </div>
  );
};

export default Layout;
