import { SearchPartyEgg } from "@components/EasterEggs/SearchParty";
import { TrySomeOfThese } from "@components/IntroLinks";
import Layout from "@components/Layout";
import Header, { PageMain } from "@components/PostHeader";
import { useRef } from "react";

export default function Custom404() {
  const searchArea = useRef<HTMLDivElement>(null);

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
        <Header title={<SearchPartyEgg searchArea={searchArea} />} />
        <p>Sorry but this page does not exist</p>
        <TrySomeOfThese />
        {/* The empty part of the page, where the search party finds its links. */}
        <div ref={searchArea} className="min-h-[45vh]" />
      </PageMain>
    </Layout>
  );
}
