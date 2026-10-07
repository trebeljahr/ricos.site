import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import { ScreenScaleDemo } from "@components/computer/ScreenScaleDemo";
import Layout from "@components/Layout";
import { PageMain } from "@components/PostHeader";

export default function BigScreensPage() {
  return (
    <Layout
      title="Why bigger screens need a GPU"
      description="The same fill on 8×8, 32×32 and 512×512 screens, done by the toy CPU, a blitter and a shader, in clock ticks."
      keywords={[]}
      url="computer/big-screens"
      noindex
      fillViewport
    >
      <PageMain className="w-full">
        <ComputerDemoNav current="big-screens" />
        <header className="not-prose flow-label mt-para mb-para">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            Why bigger screens need a GPU
          </h1>
          <p className="text-gray-700 dark:text-gray-300">
            One job: light every pixel. The toy CPU can do it one byte at a time, through a bank
            window or an auto-increment port. A blitter and a shader do it without the CPU. Pick a
            screen size and compare the clock ticks.
          </p>
        </header>
        <ScreenScaleDemo />
        <ComputerDemoNav current="big-screens" bottom />
      </PageMain>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
