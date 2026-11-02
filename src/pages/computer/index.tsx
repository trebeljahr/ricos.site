import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import Header, { PageMain } from "@components/PostHeader";
import type { ComputerChapter } from "@velite";
import Link from "next/link";
import { computerDemos, publicComputerDemos } from "../../lib/computerDemos";

const PARTS = [
  { part: 1, title: "The Basics", question: "How can on and off calculate?" },
  { part: 2, title: "Memory", question: "How does a circuit remember, and find it again?" },
  { part: 3, title: "The CPU", question: "What hardware follows one instruction?" },
  { part: 4, title: "Programs", question: "How do instructions add up to a program?" },
  { part: 5, title: "Input and Output Devices", question: "How do bits reach the world?" },
  { part: 6, title: "Operating Systems", question: "Why is there an operating system at all?" },
  { part: 7, title: "The Internet", question: "How do machines talk to each other?" },
  { part: 8, title: "Manufacturing", question: "How does all of this get built?" },
];

type PublishedChapter = Pick<ComputerChapter, "number" | "title" | "link" | "part">;

export default function ComputerSeriesHome({ chapters }: { chapters: PublishedChapter[] }) {
  return (
    <Layout
      title="How computers work"
      description="See what happens between a key press and a pixel by building it yourself, one layer at a time."
      keywords={[]}
      url="computer"
      noindex={chapters.length === 0}
    >
      <PageMain>
        <Header
          title="How computers work"
          subtitle="You use a computer all day, but what happens between a key press and a pixel stays hidden. In this series you build that path yourself, one layer at a time."
        />

        <h2>Try it now</h2>
        <p>
          I am still writing the chapters{chapters.length === 0 && ", and none is out yet"}. These
          demos already work.
        </p>
        <div className="not-prose border-t border-gray-300 dark:border-gray-700">
          {publicComputerDemos.map(({ slug, blurb }) => (
            <Link
              key={slug}
              href={`/computer/${slug}`}
              className="group grid gap-tight border-b border-gray-300 py-para transition-colors hover:text-cyan-600 dark:border-gray-700 dark:hover:text-cyan-300 sm:grid-cols-[1fr_auto] sm:items-center"
            >
              <span>
                <strong className="block text-xl font-semibold text-gray-950 group-hover:text-inherit dark:text-white">
                  {computerDemos.find((demo) => demo.slug === slug)?.title}
                </strong>
                <span className="mt-hair block text-gray-600 group-hover:text-inherit dark:text-gray-400">
                  {blurb}
                </span>
              </span>
              <span className="hidden text-2xl sm:block" aria-hidden="true">
                ↗
              </span>
            </Link>
          ))}
        </div>

        <h2>What the series will cover</h2>
        <ol className="not-prose list-none p-0">
          {PARTS.map(({ part, title, question }) => (
            <li key={part} className="mb-stack">
              <strong className="text-gray-950 dark:text-white">
                {part}. {title}
              </strong>
              <span className="block text-gray-600 dark:text-gray-400">{question}</span>
              {chapters
                .filter((chapter) => chapter.part === part)
                .map((chapter) => (
                  <Link key={chapter.link} href={chapter.link} className="block">
                    {chapter.number} {chapter.title}
                  </Link>
                ))}
            </li>
          ))}
        </ol>

        <div className="mt-section">
          <NewsletterForm
            list="announce"
            heading={<h2 className="flush-top">New things from Rico</h2>}
            text={
              <p className="mb-para">
                I make a new thing every month or two. Want to receive an email when the next one is
                out?
              </p>
            }
          />
        </div>
      </PageMain>
    </Layout>
  );
}

export async function getStaticProps() {
  const { loadVeliteData } = await import("src/lib/loadVeliteData");
  const chapters: PublishedChapter[] = loadVeliteData<ComputerChapter[]>("computerChapters.json")
    .filter((chapter) => chapter.published)
    .sort((a, b) => a.order - b.order)
    .map(({ number, title, link, part }) => ({ number, title, link, part }));
  return { props: { chapters } };
}
