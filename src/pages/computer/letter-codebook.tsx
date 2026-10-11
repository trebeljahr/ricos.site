import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import { LetterCodebook } from "@components/computer/LetterCodebook";
import Layout from "@components/Layout";

export default function LetterCodebookPage() {
  return (
    <Layout
      title="Five switches, one alphabet"
      description="Give each state of five switches a character and write text as five bits per character."
      keywords={[]}
      url="computer/letter-codebook"
      noindex
      fillViewport
    >
      <main className="mx-auto w-full max-w-6xl px-3 pb-16 pt-5 sm:px-6 sm:pt-8">
        <ComputerDemoNav current="letter-codebook" />
        <header className="mb-4 mt-4">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            LETTER CODEBOOK
          </h1>
        </header>
        {/* The width of a chapter's text column, where the demo is embedded. */}
        <div className="mx-auto max-w-prose">
          <LetterCodebook />
        </div>
        <ComputerDemoNav current="letter-codebook" bottom />
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
