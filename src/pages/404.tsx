import { TrySomeOfThese } from "@components/IntroLinks";
import Layout from "@components/Layout";
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
      <main className="py-20 px-3 max-w-5xl mx-auto">
        <h1>404 - Page Not Found</h1>
        <p>Sorry but this page does not exist</p>
        <TrySomeOfThese />
      </main>
    </Layout>
  );
}
