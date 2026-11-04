import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import { LazyLogicTutorial } from "@components/computer/tutorial/LazyLogicTutorial";

export default function UniversalNandNotPage() {
  return (
    <DeviceDemoPage wide slug="universal-nand-not" description="Build NOT using only NAND gates.">
      <LazyLogicTutorial
        title="NOT from NAND"
        levels={["universal-nand-not"]}
        height="min(88svh, 880px)"
      />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
