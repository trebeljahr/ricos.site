import Layout from "@components/Layout";
import { Search, useSearch } from "@components/SearchBar";
import { NewsletterForm } from "@components/NewsletterSignup";
import { ToTopButton } from "@components/ToTopButton";
import { Podcastnote, allPodcastnotes } from "@contentlayer/generated";
import { useEffect } from "react";
import Link from "next/link";

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
      <article>
        <section className="p-5">
          <h1>Podcastnotes</h1>
          <Search filters={filters} setFilters={setFilters} />
          <p>Amount: {filteredPodcastnotes.length}</p>
        </section>
        <section className="allPodcastnotes prose">
          {filteredPodcastnotes.map(
            ({ slug, title, show, episode, rating, excerpt }) => {
              return (
                <Link
                  href={slug}
                  key={slug}
                  className="p-5 mb-5 block no-underline card-hover"
                >
                  <h2 className="m-0 p-0 underline">{title}</h2>
                  <h3 className="mt-1">
                    {show} – Episode {episode} | Rating: {rating}/10
                  </h3>

                  <p className="prose">{excerpt}</p>
                </Link>
              );
            }
          )}
        </section>
        <section>
          <NewsletterForm />
          <ToTopButton />
        </section>
      </article>
    </Layout>
  );
}
