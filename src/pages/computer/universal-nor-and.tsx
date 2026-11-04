import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import { LazyLogicTutorial } from "@components/computer/tutorial/LazyLogicTutorial";

export default function UniversalNorAndPage() {
  return (
    <DeviceDemoPage slug="universal-nor-and" description="Build AND using only NOR gates.">
      <LazyLogicTutorial
        title="AND from NOR"
        levels={["universal-nor-and"]}
        height="min(88svh, 880px)"
      />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
