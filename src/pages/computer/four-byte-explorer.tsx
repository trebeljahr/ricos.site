import { FourByteExplorer } from "@components/computer/FourByteExplorer";
import Layout from "@components/Layout";
import Link from "next/link";

export default function FourByteExplorerPage() {
  return (
    <Layout
      title="Four bytes, many meanings"
      description="Read 32 bits as a float, integer, UTF-8 text, or RGBA color."
      keywords={[]}
      url="computer/four-byte-explorer"
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
            Four bytes, many meanings
          </h1>
          <p className="m-0 text-sm text-gray-600 dark:text-gray-400">
            Same 32 bits. Different rules.
          </p>
        </header>
        <FourByteExplorer />
        <p className="mt-4 max-w-3xl text-xs leading-5 text-gray-500 dark:text-gray-400">
          Bytes are read left to right (big-endian). UTF-8 may use all four bytes for one emoji, or
          one byte per ASCII letter. A double-precision float needs eight bytes.
        </p>
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
