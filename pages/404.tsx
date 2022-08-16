import Layout from "../components/layout";
import Link from "next/link";

export default function Custom404() {
  return (
    <Layout pageTitle="404 Page">
      <h1>404 - Page Not Found</h1>
      <p>Sorry but this page doesn{"'"}t exist</p>
      <p>
        Maybe try one of these:{" "}
        <Link as="/" href="/">
          <a className="colored-link">Posts</a>
        </Link>
        ,{" "}
        <Link as="/booknotes" href="/booknotes">
          <a className="colored-link">Booknotes</a>
        </Link>
        , or{" "}
        <Link as="/needlestack" href="/needlestack">
          <a className="colored-link">Needlestack</a>
        </Link>
      </p>
    </Layout>
  );
}
