import Layout from "@components/Layout";
import { PageMain } from "@components/PostHeader";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { ReactNode } from "react";
import { type PianoDemoSlug, pianoDemos, pianoDemosHome } from "src/lib/pianoDemos";

const linkClass =
  "inline-flex min-h-10 min-w-0 items-center rounded border border-gray-300 px-3 text-sm font-medium text-gray-800 transition-colors hover:border-orange-500 hover:text-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 dark:border-gray-700 dark:text-gray-200 dark:hover:border-orange-400 dark:hover:text-orange-300";

// Literal, so the production build drops the review with its import.
const DemoReviewBar =
  process.env.NODE_ENV === "development"
    ? dynamic(() => import("../demoReview/DemoReviewBar").then((module) => module.DemoReviewBar), {
        ssr: false,
      })
    : null;

function PianoDemoNav({ current, bottom = false }: { current: PianoDemoSlug; bottom?: boolean }) {
  const index = pianoDemos.findIndex((demo) => demo.slug === current);
  const previous = pianoDemos[index - 1];
  const next = pianoDemos[index + 1];
  return (
    <nav
      aria-label={bottom ? "Previous and next piano demos" : "Piano demo navigation"}
      className={bottom ? "mt-section border-t border-gray-300 pt-para dark:border-gray-700" : ""}
    >
      <div className="flex flex-wrap items-center justify-between gap-label">
        <Link
          href={pianoDemosHome.href}
          className="text-sm text-gray-500 hover:text-orange-700 dark:hover:text-orange-300"
        >
          {pianoDemosHome.label}
        </Link>
        <div className="flex min-w-0 max-w-full items-center gap-tight">
          {previous ? (
            <Link
              href={`/piano/${previous.slug}`}
              className={linkClass}
              aria-label={`Previous demo: ${previous.title}`}
            >
              ←{" "}
              <span className="ml-hair min-w-0 max-w-[32vw] truncate">
                {bottom ? previous.title : "Previous"}
              </span>
            </Link>
          ) : (
            <span className={`${linkClass} cursor-default opacity-65`} aria-hidden="true">
              ←
            </span>
          )}
          <span className="min-w-12 shrink-0 text-center font-mono text-xs text-gray-500 dark:text-gray-400">
            {index + 1} / {pianoDemos.length}
          </span>
          {next ? (
            <Link
              href={`/piano/${next.slug}`}
              className={linkClass}
              aria-label={`Next demo: ${next.title}`}
            >
              <span className="mr-hair min-w-0 max-w-[32vw] truncate">
                {bottom ? next.title : "Next"}
              </span>{" "}
              →
            </Link>
          ) : (
            <span className={`${linkClass} cursor-default opacity-65`} aria-hidden="true">
              →
            </span>
          )}
        </div>
      </div>
      {DemoReviewBar && !bottom && <DemoReviewBar current={current} key={current} series="piano" />}
    </nav>
  );
}

/** Credit for the piano recordings, required by their CC BY licence. */
export function PianoSampleCredit() {
  return (
    <p className="not-prose mt-para text-xs text-gray-500 dark:text-gray-400">
      Piano samples: Salamander Grand Piano V3 by Alexander Holm,{" "}
      <a className="text-inherit underline" href="https://creativecommons.org/licenses/by/3.0/">
        CC BY 3.0
      </a>
      .
    </p>
  );
}

/** The page of one piano demo: its title, then the demo. */
export function PianoDemoPage({
  slug,
  description,
  samples = true,
  children,
}: {
  slug: PianoDemoSlug;
  description: string;
  /** The demo plays the sampled piano, so the page credits the recordings. */
  samples?: boolean;
  children: ReactNode;
}) {
  const title = pianoDemos.find((item) => item.slug === slug)?.title;
  if (!title) throw new Error(`No piano demo at “${slug}”.`);
  return (
    <Layout
      title={title}
      description={description}
      keywords={[]}
      url={`piano/${slug}`}
      noindex
      fillViewport
    >
      <PageMain className="w-full">
        <PianoDemoNav current={slug} />
        <header className="not-prose flow-label mt-para mb-para">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            {title}
          </h1>
        </header>
        {children}
        {samples && <PianoSampleCredit />}
        <PianoDemoNav current={slug} bottom />
      </PageMain>
    </Layout>
  );
}

/** For each demo page's getStaticProps: the page only exists under `next dev`. */
export function devOnlyProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
