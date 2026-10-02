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
      <main className="mx-auto w-full max-w-6xl px-3 pb-16 pt-5 sm:px-6 sm:pt-8">
        <Link
          href="/computer"
          className="text-sm text-gray-500 hover:text-cyan-600 dark:hover:text-cyan-300"
        >
          ← All computer demos
        </Link>
        <header className="mb-4 mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            One byte, many meanings
          </h1>
          <p className="m-0 text-sm text-gray-600 dark:text-gray-400">
            Press a bit. Change the reading.
          </p>
        </header>
        <ByteExplorer />
        <p className="mt-4 max-w-3xl text-xs leading-5 text-gray-500 dark:text-gray-400">
          Unicode shows a code point; UTF-8 characters may need more than one byte. E4M3 is an
          illustrative 8-bit float. Indexed color uses the xterm-256 palette.
        </p>
        <Link
          href="/computer/four-byte-explorer"
          className="mt-8 block border-t border-gray-300 py-5 text-sm font-medium text-gray-800 hover:text-cyan-600 dark:border-gray-700 dark:text-gray-200 dark:hover:text-cyan-300"
        >
          Next: four bytes, many meanings →
        </Link>
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
