import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import { LazyLogicTutorial } from "@components/computer/tutorial/LazyLogicTutorial";

export default function UniversalNorOrPage() {
  return (
    <DeviceDemoPage slug="universal-nor-or" description="Build OR using only NOR gates.">
      <LazyLogicTutorial
        title="OR from NOR"
        levels={["universal-nor-or"]}
        height="min(88svh, 880px)"
      />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
