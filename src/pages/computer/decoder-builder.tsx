import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import { LazyLogicTutorial } from "@components/computer/tutorial/LazyLogicTutorial";
import { SINGLE_TASK_BUILDER } from "src/lib/computer/tutorial/types";

export default function DecoderBuilderPage() {
  return (
    <DeviceDemoPage wide slug="decoder-builder" description="Wire a two-to-four decoder yourself.">
      <LazyLogicTutorial
        title="Build a decoder"
        levels={["decoder"]}
        features={SINGLE_TASK_BUILDER}
      />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
