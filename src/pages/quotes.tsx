import { Search, useSearch } from "@components/SearchBar";
import { ToTopButton } from "@components/ToTopButton";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterSignup";
import quotesJSON from "../content/Notes/pages/quotes.json";
import Header from "@components/PostHeader";
import { BreadCrumbs } from "@components/BreadCrumbs";
const quotes: Quote[] = quotesJSON;

type Quote = {
  author: string;
  content: string;
  tags: string[];
};

function toFilters({ author }: Quote) {
  return { author };
}

export default function Quotes() {
  const { byFilters, filters, setFilters } = useSearch(quotes.map(toFilters));
  const filteredQuotes = quotes.filter(byFilters);
  const url = "quotes";

  return (
    <Layout
      title="Quotes - a collection of quotes from a curious person"
      description="Here, on this page, I collect quotes I have found from all kinds of different sources. Books, movies, series, blog posts, whenever I find a phrase I really like, I put it here eventually."
      image="/assets/midjourney/a-collection-of-notes-of-importance.jpg"
      imageAlt="a collection of handwritten notes on paper"
      url={url}
      keywords={[
        "quotes",
        "collection",
        "writing",
        "snippets",
        "remember",
        "memories",
        "curious",
        "archive",
        "books",
        "quotes from books",
        "quotes from movies",
        "quotes from blog posts",
        "quotes from podcasts",
        "quote collection",
        "quote archive",
        "great writing",
        "soundbites",
      ]}
    >
      <main className="mb-20 px-3">
        <BreadCrumbs path={url} />

        <section>
          <Header
            title="Quotes"
            subtitle="Snippets of writing that I want to remember"
          />

          <Search setFilters={setFilters} filters={filters} />
          <p>Amount: {filteredQuotes.length}</p>
          {filteredQuotes.map(({ author, content }, index) => {
            return (
              <div key={author + index} className="quote">
                <blockquote>
                  <p>{content}</p>
                </blockquote>
                <p>— {author}</p>
              </div>
            );
          })}
        </section>
      </main>

      <footer className="mb-20 px-3">
        <NewsletterForm />
        <ToTopButton />
      </footer>
    </Layout>
  );
}
