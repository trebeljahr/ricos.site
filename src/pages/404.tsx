import { TrySomeOfThese } from "@components/IntroLinks";
import Layout from "@components/Layout";
import Header from "@components/PostHeader";
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
      <main className="pt-5 pb-20 px-3 max-w-5xl mx-auto">
        <Header title="404 - Page Not Found" />
        <p>Sorry but this page does not exist</p>
        <TrySomeOfThese />
      </main>
    </Layout>
  );
}
