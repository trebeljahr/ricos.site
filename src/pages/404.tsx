import { SearchPartyEgg } from "@components/EasterEggs/SearchParty";
import Layout from "@components/Layout";
import Header, { PageMain } from "@components/PostHeader";

export default function Custom404() {
  return (
    <Layout
      title="404 Page"
      description="A 404 page, there is nothing here to look at..."
      url="404"
      keywords={["404", "page not found", "error"]}
      image="/assets/blog/404.jpg"
      imageAlt="this is not a page pipe meme joke"
    >
      <PageMain>
        {/* All of it is under the paint until the page is wiped clean. */}
        <Header title="404 - Page Not Found" />
        <p>Sorry but this page does not exist</p>
        <p>Try if you can find some other pages instead.</p>
        <SearchPartyEgg />
      </PageMain>
    </Layout>
  );
}
