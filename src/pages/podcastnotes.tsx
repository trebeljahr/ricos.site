import { BreadCrumbs } from "@components/BreadCrumbs";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import Header from "@components/PostHeader";
import { Search } from "@components/SearchBar";
import { ToTopButton } from "@components/ToTopButton";
import Link from "next/link";
import { useState } from "react";
import { CommonMetadata } from "src/@types";
import { getSeoInfo, SeoInfo } from "src/lib/getSeoInfo";
import { loadVeliteData } from "src/lib/loadVeliteData";
import { extractAndSortMetadata } from "src/lib/utils/extractAndSortMetadata";

type Props = {
  podcastnotes: CommonMetadata[];
  seo: SeoInfo | null;
};

export default function Podcastnotes({ podcastnotes, seo }: Props) {
  const [filtered, setFiltered] = useState<CommonMetadata[]>([]);

  const url = "podcastnotes";
  return (
    <Layout
      title={seo?.metaTitle || "Podcastnotes - notes on the things I've listened to"}
      description={seo?.metaDescription || "An overview of podcast episodes I've listened to, with notes and key takeaways"}
      image={seo?.ogImage || "/assets/blog/podcastnotes.jpg"}
      imageAlt={seo?.ogImageAlt || "a collection of hand written notes next to a podcast microphone"}
      keywords={seo?.keywords || ["podcastnotes", "podcasts", "notes", "learnings"]}
      url={url}
    >
      <main className="py-20 px-3 max-w-5xl mx-auto">
        <BreadCrumbs path={url} />

        <section>
          <Header
            title="Podcastnotes"
            subtitle="What I have learned while listening"
          />
          <Search
            all={podcastnotes}
            setFiltered={setFiltered}
            searchByTitle="Search by title, show name or tags..."
            searchKeys={["title", "show", "tags"]}
          />
          <p>Amount: {filtered.length}</p>

          {filtered.map(
            ({ link, slug, title, show, episode, rating, excerpt }) => {
              return (
                <div key={slug}>
                  <Link
                    href={link}
                    className="no-underline prose-h2:text-inherit p-5 my-10 block prose-p:text-zinc-800 dark:prose-p:text-slate-300 transform transition duration-300 hover:scale-[1.02]"
                  >
                    <h2 className="m-0 p-0">{title}</h2>
                    <h3 className="mt-1">
                      {show} – Episode {episode} | Rating: {rating}/10
                    </h3>

                    <p className="mb-1">{excerpt}</p>
                  </Link>
                  <div className="h-px bg-slate-500" />
                </div>
              );
            }
          )}
        </section>

        <footer>
          <NewsletterForm />
          <ToTopButton />
        </footer>
      </main>
    </Layout>
  );
}

export function getStaticProps() {
  const allPodcastnotes = loadVeliteData("podcastnotes.json");
  const podcastnotes = extractAndSortMetadata(allPodcastnotes);

  return {
    props: {
      podcastnotes,
      seo: getSeoInfo("/podcastnotes"),
    },
  };
}
