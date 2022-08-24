import Layout from "../components/layout";
import { TrySomeOfThese } from "../components/intro-links";

export default function TodoPage() {
  return (
    <Layout pageTitle="#TODO">
      <h1>You hit the #TODO part of this website</h1>
      <p>
        This means that there is a link to something that I want to still
        implement, but have not got around to yet. If you check beck at a later
        point in time, there might be something here.
      </p>
      <TrySomeOfThese />
    </Layout>
  );
}
