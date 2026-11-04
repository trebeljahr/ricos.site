import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import { LazyLogicTutorial } from "@components/computer/tutorial/LazyLogicTutorial";

export default function UniversalNandAndPage() {
  return (
    <DeviceDemoPage slug="universal-nand-and" description="Build AND using only NAND gates.">
      <LazyLogicTutorial
        title="AND from NAND"
        levels={["universal-nand-and"]}
        height="min(88svh, 880px)"
      />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
