import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import Layout from "@components/Layout";
import Header, { PageMain } from "@components/PostHeader";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { getSeriesStatusProps } from "src/lib/computerSeriesStatus";
import {
  INPUT_DEVICE_CORE_LESSONS,
  INPUT_DEVICE_LESSONS,
} from "../../lib/computer/inputDeviceLessons";

const LogicTutorial = dynamic(
  () =>
    import("@components/computer/tutorial/LogicTutorial").then((module) => module.LogicTutorial),
  { ssr: false, loading: () => <p className="p-stack">Loading the builder…</p> },
);

export default function BuildFromNandPage({ seriesIsOut }: { seriesIsOut: boolean }) {
  const router = useRouter();
  const level = typeof router.query.level === "string" ? router.query.level : undefined;
  const inputPractice = INPUT_DEVICE_LESSONS.includes(level ?? "");
  return (
    <Layout
      title="Build a computer from transistors"
      description="Wire every part of a computer yourself, from transistors up through NAND, adders, an ALU and memory. Each level checks your circuit against its truth table."
      keywords={[]}
      url="computer/build-from-nand"
      noindex={!seriesIsOut}
    >
      <PageMain>
        <ComputerDemoNav current="build-from-nand" />
        {/* On a phone the subtitle would push the level's goal and the canvas off the first screen. */}
        <div className="max-sm:[&_hgroup>p]:hidden">
          <Header
            title="Build a computer from transistors"
            subtitle="Each level asks for one part and gives you the parts you built before. Check your wiring against the truth table, then use your own part in the next level."
          />
        </div>
        {/* Full bleed: the builder needs the room of the whole window. A phone scrolls the page instead. */}
        <div
          data-phone-flow=""
          className="not-prose mt-para ml-[calc(50%-50vw+0.75rem)] h-[88svh] min-h-[620px] w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl max-sm:h-auto max-sm:min-h-0"
        >
          {router.isReady && (
            <LogicTutorial
              level={level}
              levels={inputPractice ? INPUT_DEVICE_CORE_LESSONS : undefined}
              sequential={!inputPractice}
              chapterLinks={process.env.NODE_ENV !== "production"}
              onLevelChange={(id) =>
                router.replace({ query: { level: id } }, undefined, {
                  shallow: true,
                  scroll: false,
                })
              }
            />
          )}
        </div>
        <ComputerDemoNav current="build-from-nand" bottom />
      </PageMain>
    </Layout>
  );
}

export const getStaticProps = getSeriesStatusProps;
