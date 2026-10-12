import Layout from "@components/Layout";
import { PageMain } from "@components/PostHeader";
import type { ReactNode } from "react";
import { type ComputerDemoSlug, computerDemos } from "src/lib/computerDemos";
import { ComputerDemoNav } from "./ComputerDemoNav";

/** The page of one hands-on device demo: its title, what to do, then the demo. */
export function DeviceDemoPage({
  slug,
  description,
  intro,
  children,
}: {
  slug: ComputerDemoSlug;
  description: string;
  intro: string;
  children: ReactNode;
}) {
  const title = computerDemos.find((item) => item.slug === slug)?.title;
  if (!title) throw new Error(`No computer demo at “${slug}”.`);
  return (
    <Layout
      title={title}
      description={description}
      keywords={[]}
      url={`computer/${slug}`}
      noindex
      fillViewport
    >
      <PageMain className="w-full">
        <ComputerDemoNav current={slug} />
        <header className="not-prose flow-label mt-para mb-para">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            {title}
          </h1>
          <p className="text-gray-700 dark:text-gray-300">{intro}</p>
        </header>
        {children}
        <ComputerDemoNav current={slug} bottom />
      </PageMain>
    </Layout>
  );
}
