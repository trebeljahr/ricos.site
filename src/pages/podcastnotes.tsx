import Layout from "../components/layout";
import { Search, useSearch } from "../components/SearchBar";
import { NewsletterForm } from "../components/newsletter-signup";
import { ToTopButton } from "../components/ToTopButton";
import { PodcastNote, allPodcastNotes } from "contentlayer/generated";
import { useEffect } from "react";
import Link from "next/link";

function toFilters({ title, rating, tags, show }: PodcastNote) {
  return { title, rating, tags, show };
}

export default function PodcastNotes() {
  const { byFilters, filters, setFilters } = useSearch(
    allPodcastNotes.map(toFilters)
  );
  const filteredPodcastNotes = allPodcastNotes.filter(byFilters);

  useEffect(() => {
    setFilters((old) => {
      return { ...old, summary: { ...old.summary, active: true, value: true } };
    });
  }, [setFilters]);

  return (
    <Layout
      title="PodcastNotes - notes on the things I've read"
      description={
        "An overview of what I have read, with a filterable list of books and PodcastNotes"
      }
    >
      <article>
        <section className="main-section">
          <Search filters={filters} setFilters={setFilters} />
          <h1>PodcastNotes</h1>
          <p>Amount: {filteredPodcastNotes.length}</p>
        </section>
        <section className="main-section allPodcastNotes">
          {filteredPodcastNotes.map(
            ({ slug, title, show, episode, rating, excerpt }) => {
              return (
                <div key={slug} className="podcastnote-link-card">
                  <Link href={`/podcastnotes/${slug}`}>
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
        <section className="main-section">
          <NewsletterForm />
          <ToTopButton />
        </section>
      </article>
    </Layout>
  );
}
