import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import { LazyLogicTutorial } from "@components/computer/tutorial/LazyLogicTutorial";

export default function UniversalNandOrPage() {
  return (
    <DeviceDemoPage slug="universal-nand-or" description="Build OR using only NAND gates.">
      <LazyLogicTutorial
        title="OR from NAND"
        levels={["universal-nand-or"]}
        height="min(88svh, 880px)"
      />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
