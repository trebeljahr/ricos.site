import Layout from "@components/Layout";
import Link from "next/link";

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
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-500">
          Computer / demo lab
        </p>
        <h1 className="mt-5 max-w-2xl text-5xl font-bold tracking-tight text-gray-950 dark:text-white sm:text-7xl">
          How a computer reads bits
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-gray-600 dark:text-gray-400">
          A local index of interactive experiments for the writing series.
        </p>
        <div className="mt-16 border-t border-gray-300 dark:border-gray-700">
          <Link
            href="/computer/byte-explorer"
            className="group grid gap-4 border-b border-gray-300 py-8 transition-colors hover:text-cyan-600 dark:border-gray-700 dark:hover:text-cyan-300 sm:grid-cols-[4rem_1fr_auto] sm:items-center"
          >
            <span className="font-mono text-sm text-gray-500">01</span>
            <span>
              <strong className="block text-2xl font-semibold text-gray-950 group-hover:text-inherit dark:text-white">
                One byte, many meanings
              </strong>
              <span className="mt-2 block text-sm text-gray-600 dark:text-gray-400">
                Flip eight bits. Read them as numbers, text, and color.
              </span>
            </span>
            <span className="text-2xl" aria-hidden="true">
              ↗
            </span>
          </Link>
        </div>
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
