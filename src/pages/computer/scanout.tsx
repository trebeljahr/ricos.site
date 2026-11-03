import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import { ScanoutDemo } from "@components/computer/ScanoutDemo";
import Layout from "@components/Layout";
import { PageMain } from "@components/PostHeader";

export default function ScanoutPage() {
  return (
    <Layout
      title="Read the screen out like a display"
      description="A scanout reads the toy CPU's screen one pixel per tick, and a redraw at the wrong time tears the picture."
      keywords={[]}
      url="computer/scanout"
      noindex
      fillViewport
    >
      <PageMain className="w-full">
        <ComputerDemoNav current="scanout" />
        <header className="not-prose flow-label mt-para mb-para">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            Read the screen out like a display
          </h1>
        </header>
        <ScanoutDemo />
        <ComputerDemoNav current="scanout" bottom />
      </PageMain>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
