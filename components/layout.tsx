// import Footer from "./footer";
import Meta from "./meta";
import { useEffect } from "react";
import Prism from "prismjs";
import "prismjs/plugins/toolbar/prism-toolbar";
import "prismjs/plugins/copy-to-clipboard/prism-copy-to-clipboard";

type Props = {
  children: React.ReactNode;
};

const Layout = ({ children }: Props) => {
  useEffect(() => {
    if (typeof window !== "undefined") {
      Prism.highlightAll();
    }
  }, []);

  return (
    <div className="main-page">
      <Meta />
      <main>{children}</main>
      {/* <Footer /> */}
    </div>
  );
};

export default Layout;
