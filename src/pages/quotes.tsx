import { Search, useSearch } from "../components/SearchBar";
import { ToTopButton } from "../components/ToTopButton";
import Layout from "../components/layout";
import { NewsletterForm } from "../components/newsletter-signup";
import quotesJSON from "../content/pages/quotes.json";

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

  return (
    <Layout
      title="Quotes - a collection of quotes from a curious person"
      description="Here, on this page, I collect quotes I have found from all kinds of different sources. Books, movies, series, blog posts, whenever I find a phrase I really like, I put it here eventually."
      image="/assets/midjourney/a-collection-of-notes-of-importance.jpg"
      url="quotes"
      imageAlt="a collection of handwritten notes on paper"
    >
      <article>
        <section className="main-section">
          <Search setFilters={setFilters} filters={filters} />
          <h1>Quotes</h1>
          <p>Amount: {filteredQuotes.length}</p>
        </section>
        <section className="main-section">
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
        <section className="main-section">
          <NewsletterForm />
          <ToTopButton />
        </section>
      </article>
    </Layout>
  );
}
