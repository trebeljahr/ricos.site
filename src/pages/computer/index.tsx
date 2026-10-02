import Layout from "@components/Layout";
import Link from "next/link";
import { computerDemos } from "../../lib/computerDemos";

export default function ComputerDemosIndex() {
  return (
    <Layout
      title="Computer demos"
      description="Interactive experiments for explaining how computers work."
      keywords={[]}
      url="computer"
      noindex
      fillViewport
    >
      <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-16 sm:px-8 sm:pt-24">
        <h1 className="max-w-2xl text-5xl font-bold tracking-tight text-gray-950 dark:text-white sm:text-7xl">
          Computer demos
        </h1>
        <div className="mt-16 border-t border-gray-300 dark:border-gray-700">
          {computerDemos.map((demo, index) => (
            <Link
              key={demo.slug}
              href={`/computer/${demo.slug}`}
              className="group grid gap-4 border-b border-gray-300 py-8 transition-colors hover:text-cyan-600 dark:border-gray-700 dark:hover:text-cyan-300 sm:grid-cols-[4rem_1fr_auto] sm:items-center"
            >
              <span className="font-mono text-sm text-gray-500">
                {String(index + 1).padStart(2, "0")}
              </span>
              <strong className="block text-2xl font-semibold text-gray-950 group-hover:text-inherit dark:text-white">
                {demo.title}
              </strong>
              <span className="text-2xl" aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
