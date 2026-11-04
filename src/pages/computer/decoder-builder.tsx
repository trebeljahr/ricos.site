import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import { LazyLogicTutorial } from "@components/computer/tutorial/LazyLogicTutorial";

export default function DecoderBuilderPage() {
  return (
    <DeviceDemoPage slug="decoder-builder" description="Wire a two-to-four decoder yourself.">
      <LazyLogicTutorial title="Build a decoder" levels={["decoder"]} />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
