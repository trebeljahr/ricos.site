import Layout from "../components/layout";
import { getAllPosts } from "../lib/api";
import { TrySomeOfThese } from "../components/intro-links";
import Link from "next/link";
import { ExternalLink } from "../components/ExternalLink";

const Index = () => {
  return (
    <Layout pageTitle="Home">
      <h1></h1>
      <h2>Hi there 👋🏻</h2>
      <p>
        I am Rico. A programmer, traveler, photographer, writer and fellow
        human. This is my personal website. It will be filled with lots of
        different things. But is <em>currently</em> still under construction.
      </p>
      <p>
        Here is where I want to collect thoughts, booknotes, quotes, ideas,
        useful links to my favorite places in the internet, traveling stories,
        photography and my side projects. For now I still have an old - second
        site - over at{" "}
        <ExternalLink href="https://ricotrebeljahr.com">
          ricotrebeljahr.com
        </ExternalLink>{" "}
        but the content will eventually also move over here.
      </p>
      <TrySomeOfThese />
      <p>
        If you want to know what I am doing now, head over to{" "}
        <Link as={`/now`} href="/now">
          <a>/now</a>
        </Link>
      </p>
      <p>
        You can also find me on other places around the internet, like{" "}
        <ExternalLink href="https://www.instagram.com/ricotrebeljahr/">
          Instagram
        </ExternalLink>
        ,{" "}
        <ExternalLink href="https://github.com/trebeljahr">Github</ExternalLink>
        ,{" "}
        <ExternalLink href="https://www.linkedin.com/in/trebeljahr">
          LinkedIn
        </ExternalLink>{" "}
        or{" "}
        <ExternalLink href="https://twitter.com/ricotrebeljahr">
          Twitter
        </ExternalLink>
      </p>
      <p>
        I also used to write a travel blog with a friend of mine, which you can
        still find at{" "}
        <ExternalLink href="https://photodyssee.com">
          photodyssee.com
        </ExternalLink>
        .
      </p>
    </Layout>
  );
};

export default Index;

export const getStaticProps = async () => {
  const allPosts = getAllPosts([
    "title",
    "date",
    "slug",
    "author",
    "coverImage",
    "excerpt",
  ]);
  return {
    props: { allPosts },
  };
};
