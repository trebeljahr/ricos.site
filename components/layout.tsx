// import Footer from "./footer";
import Meta from "./meta";

type Props = {
  children: React.ReactNode;
  description?: string;
};

const Layout = ({ children, description }: Props) => {
  return (
    <div className="main-page">
      <Meta description={description} />
      <main>{children}</main>
      {/* <Footer /> */}
    </div>
  );
};

export default Layout;
