import Layout from "../components/layout";
import fs from "fs/promises";
import { join } from "path";
import matter from "gray-matter";
import { useState } from "react";
import { Search, useSearch } from "../components/SearchBar";

type Quote = {
  author: string;
  text: string;
};

type Props = {
  quotes: Quote[];
};

const emptySearchFilters = { author: "", text: "" };
export default function Quotes({ quotes }: Props) {
  const { byFilters, filters, setFilters } = useSearch(emptySearchFilters);
  const filteredQuotes = quotes.filter(byFilters);

  return (
    <Layout>
      <Search setFilters={setFilters} filters={filters} />
      <h1>Quotes</h1>
      <p>Amount: {filteredQuotes.length}</p>
      {filteredQuotes.map(({ author, text }, index) => {
        return (
          <div key={author + index} className="quote">
            <h3>{text}</h3>
            <p>by {author}</p>
          </div>
        );
      })}
    </Layout>
  );
}

export async function getStaticProps() {
  const quotesSrc = join(process.cwd(), "_pages", "quotes.md");
  const fileContents = await fs.readFile(quotesSrc, "utf-8");
  const { data, content } = matter(fileContents);
  const [, ...quotes] = content.split("\n> ");
  const quoteData = quotes.map((quote) => {
    const [text, author] = quote
      .split("\n— ")
      .map((str) => str.replace("\n", "").trim());
    return { text, author };
  });
  return {
    props: {
      quotes: quoteData,
    },
  };
}
