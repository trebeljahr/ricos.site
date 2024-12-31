import { BreadCrumbs } from "@components/BreadCrumbs";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import Header from "@components/PostHeader";
import { Search } from "@components/SearchBar";
import { ToTopButton } from "@components/ToTopButton";
import { podcastnotes as allPodcastnotes } from "@velite";
import Link from "next/link";
import { useState } from "react";
import { CommonMetadata, extractAndSortMetadata } from "src/lib/utils";

type Props = {
  podcastnotes: CommonMetadata[];
};

export default function Podcastnotes({ podcastnotes }: Props) {
  const [filtered, setFiltered] = useState<CommonMetadata[]>([]);

  const url = "podcastnotes";
  return (
    <Layout
      title="Podcastnotes - notes on the things I've read"
      description={
        "An overview of what I have read, with a filterable list of books and Podcastnotes"
      }
      image="/assets/blog/podcastnotes.jpg"
      imageAlt="a collection of hand written notes next to a podcast microphone"
      keywords={[
        "podcastnotes",
        "podcasts",
        "notes",
        "learnings",
        "learning",
        "summary",
        "podcast",
        "podcast notes",
        "podcast learnings",
        "podcast summary",
        "podcast learnings",
      ]}
      url={url}
    >
      <main className="mb-20 px-3">
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
      </main>

      <footer className="mb-20 px-3">
        <NewsletterForm />
        <ToTopButton />
      </footer>
    </Layout>
  );
}

export function getStaticProps() {
  const podcastnotes = extractAndSortMetadata(allPodcastnotes);

  return {
    props: {
      podcastnotes,
    },
  };
}
