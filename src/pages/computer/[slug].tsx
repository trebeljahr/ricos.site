import Layout from "@components/Layout";
import { MDXContent } from "@components/MDXContent";
import Header, { PageMain } from "@components/PostHeader";
import type { ComputerChapter } from "@velite";
import dynamic from "next/dynamic";
import Link from "next/link";

const MDXContentWithDemos = dynamic(() =>
  import("@components/MDXContentWithDemos").then((m) => m.MDXContentWithDemos),
);

// One chapter or aside of the "how computers work" series, from
// src/content/Notes/computer/. Production builds only the chapters marked
// `published: true`; under `next dev` every chapter renders, with a draft
// note, so the text can be read with its demos while it is being written.

type Neighbour = { number: string; title: string; link: string };

type Props = {
  chapter: Pick<
    ComputerChapter,
    | "title"
    | "slug"
    | "number"
    | "kind"
    | "part"
    | "partTitle"
    | "summary"
    | "status"
    | "published"
    | "content"
    | "hasDemos"
  >;
  prev: Neighbour | null;
  next: Neighbour | null;
};

const isDev = process.env.NODE_ENV === "development";

function NeighbourLink({ neighbour, label }: { neighbour: Neighbour | null; label: string }) {
  if (!neighbour) return <span />;
  return (
    <Link href={neighbour.link} className="block no-underline">
      <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </span>
      <span className="font-semibold">
        {neighbour.number} {neighbour.title}
      </span>
    </Link>
  );
}

export default function ComputerChapterPage({ chapter, prev, next }: Props) {
  const Content = chapter.hasDemos ? MDXContentWithDemos : MDXContent;
  return (
    <Layout
      title={chapter.title}
      description={chapter.summary ?? `Part ${chapter.part} of How computers work.`}
      url={`computer/${chapter.slug}`}
      keywords={["computers"]}
      noindex={!chapter.published}
    >
      <PageMain>
        <article className="mx-auto max-w-prose">
          <Header
            breadcrumbs={{ path: `computer/${chapter.slug}` }}
            title={chapter.title}
            subtitle={`${chapter.number}${chapter.kind === "aside" ? " · Aside" : ""} · Part ${chapter.part}: ${chapter.partTitle}`}
          />
          {!chapter.published && (
            <p className="not-prose mb-para rounded-md border border-dashed border-gray-400 px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
              Draft ({chapter.status}). Only visible under <code>npm run dev</code>.
            </p>
          )}
          <Content source={chapter.content} />
          <nav className="not-prose mt-section grid grid-cols-2 gap-para border-t border-gray-200 pt-para dark:border-gray-800">
            <NeighbourLink neighbour={prev} label="Previous" />
            <div className="text-right">
              <NeighbourLink neighbour={next} label="Next" />
            </div>
          </nav>
        </article>
      </PageMain>
    </Layout>
  );
}

function visibleChapters(chapters: ComputerChapter[]) {
  return chapters.filter((c) => isDev || c.published).sort((a, b) => a.order - b.order);
}

export async function getStaticPaths() {
  const { loadVeliteData, veliteFallback } = await import("src/lib/loadVeliteData");
  const chapters = visibleChapters(loadVeliteData<ComputerChapter[]>("computerChapters.json"));
  return {
    paths: chapters.map(({ slug }) => ({ params: { slug } })),
    fallback: veliteFallback,
  };
}

export async function getStaticProps({ params }: { params: { slug: string } }) {
  const { loadVeliteData } = await import("src/lib/loadVeliteData");
  const chapters = visibleChapters(loadVeliteData<ComputerChapter[]>("computerChapters.json"));
  const index = chapters.findIndex((c) => c.slug === params.slug);
  if (index === -1) return { notFound: true } as const;
  const c = chapters[index];
  const neighbour = (n: ComputerChapter | undefined): Neighbour | null =>
    n ? { number: n.number, title: n.title, link: n.link } : null;
  const props: Props = {
    chapter: {
      title: c.title,
      slug: c.slug,
      number: c.number,
      kind: c.kind,
      part: c.part,
      partTitle: c.partTitle,
      status: c.status,
      published: c.published,
      content: c.content,
      hasDemos: c.hasDemos,
      ...(c.summary ? { summary: c.summary } : {}),
    },
    prev: neighbour(chapters[index - 1]),
    next: neighbour(chapters[index + 1]),
  };
  return { props };
}
