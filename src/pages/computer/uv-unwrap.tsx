import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import { UvUnwrap } from "@components/computer/UvUnwrap";
import Layout from "@components/Layout";

export default function UvUnwrapPage() {
  return (
    <Layout
      title="Cut a mesh along seams and flatten it"
      description="Cut seams, flatten a mesh into UV space, and paint on either side."
      keywords={[]}
      url="computer/uv-unwrap"
      noindex
      fillViewport
    >
      <main className="mx-auto w-full max-w-6xl px-3 pb-16 pt-5 sm:px-6 sm:pt-8">
        <ComputerDemoNav current="uv-unwrap" />
        <header className="mb-4 mt-4">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            UV UNWRAPPING
          </h1>
        </header>
        {/* The width of a chapter's text column, where the demo is embedded. */}
        <div className="mx-auto max-w-prose">
          <UvUnwrap />
        </div>
        <ComputerDemoNav current="uv-unwrap" bottom />
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
