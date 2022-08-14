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
        <Link as="/books" href="/books">
          <a className="colored-link">Notes</a>
        </Link>
        , or{" "}
        <Link as="/needlestack" href="/needlestack">
          <a className="colored-link">Needlestack</a>
        </Link>
      </p>
    </Layout>
  );
}
