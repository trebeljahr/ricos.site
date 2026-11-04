import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import Header, { PageMain } from "@components/PostHeader";
import type { ComputerChapter } from "@velite";
import Link from "next/link";
import { type ComputerDemoSlug, computerDemos, publicComputerDemos } from "../../lib/computerDemos";

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

type PublishedChapter = Pick<ComputerChapter, "number" | "title" | "link" | "part"> & {
  summary: string | null;
};

const demoTitle = (slug: ComputerDemoSlug) =>
  computerDemos.find((demo) => demo.slug === slug)?.title ?? slug;

function ListRow({ href, title, blurb }: { href: string; title: string; blurb: string | null }) {
  return (
    <Link
      href={href}
      className="group grid gap-tight border-b border-gray-300 py-para transition-colors hover:text-cyan-600 dark:border-gray-700 dark:hover:text-cyan-300 sm:grid-cols-[1fr_auto] sm:items-center"
    >
      <span>
        <strong className="block text-xl font-semibold text-gray-950 group-hover:text-inherit dark:text-white">
          {title}
        </strong>
        {blurb && (
          <span className="mt-hair block text-gray-600 group-hover:text-inherit dark:text-gray-400">
            {blurb}
          </span>
        )}
      </span>
      <span className="hidden text-2xl sm:block" aria-hidden="true">
        ↗
      </span>
    </Link>
  );
}

export default function ComputerSeriesHome({ chapters }: { chapters: PublishedChapter[] }) {
  return (
    <Layout
      title="How computers work"
      description="How we got sand to think. There's no trick to it, only layer upon layer of clever abstractions, from a single on/off switch up to the internet."
      keywords={[]}
      url="computer"
      image="/images/computer/og-computer.jpg"
      imageAlt="How computers work: the title over a Pentium II chip photo, beside panels for a neural net, the internet, an OS, a CPU, 3D graphics, a transistor, logic gates and Unicode"
      imageWidth={1200}
      imageHeight={630}
      noindex={chapters.length === 0}
    >
      <PageMain>
        <Header
          title="How computers work"
          subtitle="How we got sand to think. There's no trick to it, only layer upon layer of clever abstractions. The series starts at a single on/off switch and climbs up to the internet, and you get to play with each layer through interactive demos as you go."
        />

        {chapters.length > 0 && (
          <>
            <h2>Read the first chapter</h2>
            <p>This is an early version, and I am still revising it.</p>
            <div className="not-prose border-t border-gray-300 dark:border-gray-700">
              {chapters.map(({ link, number, title, summary }) => (
                <ListRow key={link} href={link} title={`${number} ${title}`} blurb={summary} />
              ))}
            </div>
          </>
        )}

        <h2>Try it now</h2>
        <p>These demos are ready to use.</p>
        <div className="not-prose border-t border-gray-300 dark:border-gray-700">
          {publicComputerDemos.map(({ slug, blurb }) => (
            <ListRow key={slug} href={`/computer/${slug}`} title={demoTitle(slug)} blurb={blurb} />
          ))}
        </div>

        <h2>The plan</h2>
        <p>
          The series has eight parts. It starts at a single on/off switch and ends at the internet.
          I publish one part at a time, and I am writing Part 1 now.
        </p>
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
    .map(({ number, title, link, part, summary }) => ({
      number,
      title,
      link,
      part,
      summary: summary ?? null,
    }));
  return { props: { chapters } };
}
