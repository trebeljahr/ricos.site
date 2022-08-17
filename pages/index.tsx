import Layout from "../components/layout";
import { getAllPosts } from "../lib/api";
import { TrySomeOfThese } from "../components/intro-links";

const Index = () => {
  return (
    <Layout pageTitle="Home">
      <h1>Welcome to my part of the internet!</h1>
      <p>
        This page is still under construction, but I keep adding content
        regularly.
      </p>
      <TrySomeOfThese />
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
