import Link from "next/link";
import { ExternalLink } from "@components/ExternalLink";
import { TrySomeOfThese } from "@components/IntroLinks";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterSignup";
import { allPosts } from "@contentlayer/generated";
import generateRssFeed from "src/lib/rss";
import { byOnlyPublished } from "src/lib/utils";
import React from "react";

const Index = () => {
  const description = `trebeljahr - a website about the things Rico Trebeljahr does, reads and thinks about. The topics can vary widely, 
from programming, bio-chemistry, the brain, investing, physics, philosophy to photography, traveling and back...`;

  return (
    <Layout
      title="home - Hi there 👋🏻 I am Rico. A programmer, traveler, photographer..."
      description={description}
      image="/assets/midjourney/young-man-looking-absolutely-relaxed-while-reading-a-book-in-the-milkyway.jpg"
      url="/"
      imageAlt={"a person reading a book, while floating in space"}
    >
      <main>
        <article>
          <h2>Hi there 👋🏻</h2>
          <p>
            I am Rico. A{" "}
            <Link href="https://github.com/trebeljahr">programmer</Link>,{" "}
            <Link href="/travel">traveler</Link>,{" "}
            <Link href="/photography">photographer</Link>,{" "}
            <Link href="/posts">writer</Link> and{" "}
            <Link href="/principles">fellow human</Link>. This is my personal
            website.
          </p>
          <p>
            It&apos;s where I <Link href="/posts">write</Link>,{" "}
            <Link href="/newsletters">publish my newsletter</Link>,{" "}
            <Link href="/booknotes">collect booknotes</Link>,{" "}
            <Link href="/quotes">quotes</Link>,{" "}
            <Link href="/travel">traveling stories</Link>,{" "}
            <Link href="/photography">photography</Link>, and{" "}
            <Link href="/needlestack">
              links to my favorite places on the internet
            </Link>
            .
          </p>

          <p>
            This is what I do{" "}
            <Link as={`/now`} href="/now">
              right now
            </Link>{" "}
            .
          </p>

          <h3>Webpages</h3>
          <p>
            You can also find me on other places around the internet, like{" "}
            <ExternalLink href="https://www.instagram.com/ricotrebeljahr/">
              Instagram
            </ExternalLink>
            ,{" "}
            <ExternalLink href="https://github.com/trebeljahr">
              Github
            </ExternalLink>
            ,{" "}
            <ExternalLink href="https://www.linkedin.com/in/trebeljahr">
              LinkedIn
            </ExternalLink>
            ,{" "}
            <ExternalLink href="https://twitter.com/ricotrebeljahr">
              Twitter
            </ExternalLink>
            , or at my{" "}
            <Link href="https://portfolio.trebeljahr.com">Portfolio</Link>.
          </p>
        </article>
      </main>

      <footer>
        <NewsletterForm />
      </footer>
    </Layout>
  );
};

export default Index;

export const getStaticProps = async () => {
  generateRssFeed(allPosts.filter(byOnlyPublished));
  return {
    props: {},
  };
};
