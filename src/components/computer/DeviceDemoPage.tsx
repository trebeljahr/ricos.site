import Layout from "@components/Layout";
import { PageMain } from "@components/PostHeader";
import type { ReactNode } from "react";
import { type ComputerDemoSlug, computerDemos } from "src/lib/computerDemos";
import { ComputerDemoNav } from "./ComputerDemoNav";

const ColumnMain = ({ children }: { children: ReactNode }) => (
  <PageMain className="w-full">{children}</PageMain>
);

const WideMain = ({ children }: { children: ReactNode }) => (
  <main className="mx-auto w-full max-w-6xl px-3 pb-16 pt-5 sm:px-6 sm:pt-8">{children}</main>
);

/** The page of one demo: its title, then the demo. */
export function DeviceDemoPage({
  slug,
  description,
  wide = false,
  children,
}: {
  slug: ComputerDemoSlug;
  description: string;
  /** Wider than the page column: a guided builder stacks its panels at 1000px or less. */
  wide?: boolean;
  children: ReactNode;
}) {
  const title = computerDemos.find((item) => item.slug === slug)?.title;
  if (!title) throw new Error(`No computer demo at “${slug}”.`);
  const Main = wide ? WideMain : ColumnMain;
  return (
    <Layout
      title={title}
      description={description}
      keywords={[]}
      url={`computer/${slug}`}
      noindex
      fillViewport
    >
      <Main>
        <ComputerDemoNav current={slug} />
        <header className="not-prose flow-label mt-para mb-para">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            {title}
          </h1>
        </header>
        {children}
        <ComputerDemoNav current={slug} bottom />
      </Main>
    </Layout>
  );
}
