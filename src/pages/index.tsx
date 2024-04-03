import Link from "next/link";
import { ExternalLink } from "@components/ExternalLink";
import { TrySomeOfThese } from "@components/intro-links";
import Layout from "@components/layout";
import { NewsletterForm } from "@components/newsletter-signup";

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
      <article>
        <section className="main-section">
          <h2>Hi there 👋🏻</h2>
          <p>
            I am Rico. A programmer, traveler, photographer, writer and fellow
            human. This is my personal website.
          </p>
          <p>
            Here is where I collect thoughts, books, quotes, ideas, traveling
            stories, photography, side projects and links to my favorite places
            in the internet.
          </p>
          <TrySomeOfThese />
          <p>
            If you want to know what I am doing currently, head over to{" "}
            <Link as={`/now`} href="/now">
              /now
            </Link>
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
            </ExternalLink>{" "}
            or{" "}
            <ExternalLink href="https://twitter.com/ricotrebeljahr">
              Twitter
            </ExternalLink>
            .
          </p>
          <p>
            I also used to write a travel blog with a friend of mine, which you
            can still find at{" "}
            <ExternalLink href="https://photodyssee.com">
              photodyssee.com
            </ExternalLink>
            .
          </p>
        </section>
      </article>
      <section className="main-section">
        <NewsletterForm />
      </section>
    </Layout>
  );
};

export default Index;
