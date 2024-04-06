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
      <article className="main-content">
        <section>
          <h1>Podcastnotes</h1>
          <Search filters={filters} setFilters={setFilters} />
          <p>Amount: {filteredPodcastnotes.length}</p>
        </section>
        <section className="allPodcastnotes">
          {filteredPodcastnotes.map(
            ({ slug, title, show, episode, rating, excerpt }) => {
              return (
                <div key={slug} className="Podcastnote-link-card">
                  <Link href={slug}>
                    <h2>{title}</h2>
                  </Link>
                  <h3>
                    {show} – Episode {episode} | Rating: {rating}
                  </h3>

                  <p>{excerpt}</p>
                </div>
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
