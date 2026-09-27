import { SearchPartyEgg } from "@components/EasterEggs/SearchParty";
import { ImageWithLoader } from "@components/ImageWithLoader";
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
      {/* Ceci n'est pas une page. It hangs behind everything, the glass
          included, so the search turns it up along with the words. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 select-none">
        <ImageWithLoader
          src="/assets/blog/404.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="h-full w-full object-cover opacity-60 dark:opacity-45"
        />
        {/* Enough of the page's own colour over it to keep the words readable. */}
        <div className="absolute inset-0 bg-white/55 dark:bg-gray-900/65" />
      </div>

      <PageMain>
        {/* The heading and both lines are behind the glass until they are found. */}
        <Header title="404 - Page Not Found" />
        <p data-glass-stick>Sorry but this page does not exist</p>
        <p data-glass-stick>Try if you can find some other pages instead.</p>
        <SearchPartyEgg />
      </PageMain>
    </Layout>
  );
}
