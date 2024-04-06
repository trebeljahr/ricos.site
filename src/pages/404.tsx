import { TrySomeOfThese } from "@components/IntroLinks";
import Layout from "@components/Layout";

export default function Custom404() {
  return (
    <Layout
      title="404 Page"
      description="A 404 page, there is nothing here to look at..."
      url="404"
    >
      <article className="main-content">
        <h1>404 - Page Not Found</h1>
        <p>Sorry but this page doesn{"'"}t exist</p>
        <TrySomeOfThese />
      </article>
    </Layout>
  );
}
