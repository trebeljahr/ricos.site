import { ByteExplorer } from "@components/computer/ByteExplorer";
import Layout from "@components/Layout";
import Link from "next/link";

export default function ByteExplorerPage() {
  return (
    <Layout
      title="One byte, many meanings"
      description="Explore how eight bits can become numbers, text, or color."
      keywords={[]}
      url="computer/byte-explorer"
      noindex
      fillViewport
    >
      <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-8 sm:px-8 sm:pt-12">
        <Link
          href="/computer"
          className="text-sm text-gray-500 hover:text-cyan-600 dark:hover:text-cyan-300"
        >
          ← All computer demos
        </Link>
        <header className="mb-10 mt-12 sm:mb-14">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-500">
            Experiment 01 / data representation
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-950 dark:text-white sm:text-6xl">
            One byte, many meanings.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-600 dark:text-gray-400">
            Eight bits hold a value. An encoding rule gives it meaning.
          </p>
        </header>
        <ByteExplorer />
        <p className="mt-6 max-w-3xl text-sm leading-6 text-gray-500 dark:text-gray-400">
          Unicode is shown as a code point. UTF-8 can require multiple bytes, so a single byte does
          not always represent a complete character. The E4M3 float here is a teaching format with
          IEEE-style special values.
        </p>
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
