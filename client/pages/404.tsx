import Layout from "../components/layout";
import { TrySomeOfThese } from "../components/intro-links";

export default function Custom404() {
  return (
    <Layout pageTitle="404 Page">
      <h1>404 - Page Not Found</h1>
      <p>Sorry but this page doesn{"'"}t exist</p>
      <TrySomeOfThese />
    </Layout>
  );
}
