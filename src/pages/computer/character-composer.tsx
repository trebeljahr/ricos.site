import { CharacterComposer } from "@components/computer/CharacterComposer";
import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import Layout from "@components/Layout";

export default function CharacterComposerPage() {
  return (
    <Layout
      title="Build a character from code points"
      description="Combine skin tones, joiners, flags, marks and Hangul parts into one character."
      keywords={[]}
      url="computer/character-composer"
      noindex
      fillViewport
    >
      <main className="mx-auto w-full max-w-6xl px-3 pb-16 pt-5 sm:px-6 sm:pt-8">
        <ComputerDemoNav current="character-composer" />
        <header className="mb-4 mt-4">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            CHARACTER COMPOSER
          </h1>
        </header>
        {/* The width of a chapter's text column, where the demo is embedded. */}
        <div className="mx-auto max-w-prose">
          <CharacterComposer />
        </div>
        <ComputerDemoNav current="character-composer" bottom />
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
