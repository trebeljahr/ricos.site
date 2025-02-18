import { BreadCrumbs } from "@components/BreadCrumbs";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import Header from "@components/PostHeader";
import { Search } from "@components/SearchBar";
import { ToTopButton } from "@components/ToTopButton";
import { useState } from "react";
import quotesJSON from "../content/Notes/pages/quotes.json";

const quotes: Quote[] = quotesJSON;

type Quote = {
  author: string;
  content: string;
  tags: string[];
};

export default function Quotes() {
  const [filtered, setFiltered] = useState<Quote[]>([]);
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
      <main className="py-20 px-3 mx-auto max-w-prose">
        <BreadCrumbs path={url} />

        <section>
          <Header
            title="Quotes"
            subtitle="Snippets of writing that I want to remember"
          />

          <Search
            all={quotes}
            setFiltered={setFiltered}
            searchKeys={["author"]}
            searchByTitle="Search by author..."
          />
          <p>Amount: {filtered.length}</p>
          {filtered.map(({ author, content }, index) => {
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

        <footer>
          <NewsletterForm />
          <ToTopButton />
        </footer>
      </main>
    </Layout>
  );
}
