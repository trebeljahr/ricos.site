import Layout from "@components/Layout";
import { Search, useSearch } from "@components/SearchBar";
import { NewsletterForm } from "@components/NewsletterSignup";
import { ToTopButton } from "@components/ToTopButton";
import { Podcastnote, allPodcastnotes } from "@contentlayer/generated";
import { useEffect } from "react";
import Link from "next/link";
import Header from "@components/PostHeader";
function toFilters({ title, rating, tags, show }: Podcastnote) {
  return { title, rating, tags, show };
}

export default function Podcastnotes() {
  const { byFilters, filters, setFilters } = useSearch(
    allPodcastnotes.map(toFilters)
  );
  const filteredPodcastnotes = allPodcastnotes.filter(byFilters);

  useEffect(() => {
    setFilters((old) => {
      return { ...old, summary: { ...old.summary, active: true, value: true } };
    });
  }, [setFilters]);

  return (
    <Layout
      title="Podcastnotes - notes on the things I've read"
      description={
        "An overview of what I have read, with a filterable list of books and Podcastnotes"
      }
      url="podcastnotes"
    >
      <main>
        <section>
          <Header
            title="Podcastnotes"
            subtitle="What I have learned while listening"
          />
          <Search filters={filters} setFilters={setFilters} />
          <p>Amount: {filteredPodcastnotes.length}</p>
          {filteredPodcastnotes.map(
            ({ slug, title, show, episode, rating, excerpt }) => {
              return (
                <Link
                  href={slug}
                  key={slug}
                  className="no-underline prose-headings:text-inherit p-5 mb-10 block card-hover prose-p:text-zinc-800 dark:prose-p:text-slate-300"
                >
                  <h2 className="m-0 p-0">{title}</h2>
                  <h3 className="mt-1">
                    {show} – Episode {episode} | Rating: {rating}/10
                  </h3>

                  <p className="mb-1">{excerpt}</p>
                </Link>
              );
            }
          )}
        </section>
      </main>

      <footer>
        <NewsletterForm />
        <ToTopButton />
      </footer>
    </Layout>
  );
}
