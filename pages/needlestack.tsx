import Layout from "../components/layout";
import { join } from "path";
import matter from "gray-matter";
import fs from "fs/promises";
import PostBody from "../components/post-body";
import { UtteranceComments } from "../components/comments";
import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUp } from "@fortawesome/free-solid-svg-icons";

export function ToTopButton() {
  const [visible, setVisible] = useState(false);

  const toggleVisible = () => {
    console.log("Scrolling!");
    const scrolled = document.documentElement.scrollTop;
    const visibleWhenScrolled = scrolled > window.innerHeight * 1.6;
    setVisible(visibleWhenScrolled);
  };

  useEffect(() => {
    console.log("Attaching event listener");
    window.addEventListener("scroll", toggleVisible);
    return () => window.removeEventListener("scroll", toggleVisible);
  }, []);

  return (
    <button
      id="to-top-button"
      onClick={() => {
        window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      }}
      style={{
        display: visible ? "inline" : "none",
      }}
    >
      <FontAwesomeIcon icon={faArrowUp} />
    </button>
  );
}

export default function Needlestack({ content }: { content: string }) {
  return (
    <Layout pageTitle="Needlestack">
      <PostBody content={content} />
      <ToTopButton />
      <UtteranceComments />
    </Layout>
  );
}

export async function getStaticProps() {
  const quotesSrc = join(process.cwd(), "_pages", "needlestack.md");
  const fileContents = await fs.readFile(quotesSrc, "utf-8");
  return {
    props: {
      content: matter(fileContents).content || "",
    },
  };
}
