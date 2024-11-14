import Layout from "@components/Layout";
import { Search, useSearch } from "@components/SearchBar";
import { NewsletterForm } from "@components/NewsletterSignup";
import { ToTopButton } from "@components/ToTopButton";
import { Podcastnote, podcastnotes } from "@velite";
import { useEffect } from "react";
import Link from "next/link";
import Header from "@components/PostHeader";
import { byOnlyPublished } from "src/lib/utils";
function toFilters({ title, rating, tags, show }: Podcastnote) {
  return { title, rating, tags, show };
}

export default function Podcastnotes() {
  const { byFilters, filters, setFilters } = useSearch(
    podcastnotes.map(toFilters)
  );
  const filteredPodcastnotes = podcastnotes
    .filter(byOnlyPublished)
    .filter(byFilters);

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
          <div className="px-5">
            <Header
              title="Podcastnotes"
              subtitle="What I have learned while listening"
            />
            <Search filters={filters} setFilters={setFilters} />
            <p>Amount: {filteredPodcastnotes.length}</p>
          </div>

          {filteredPodcastnotes.map(
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

      <footer>
        <NewsletterForm />
        <ToTopButton />
      </footer>
    </Layout>
  );
}
