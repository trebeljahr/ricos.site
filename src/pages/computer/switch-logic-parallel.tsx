import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import { SwitchLogic } from "@components/computer/SwitchLogic";

export default function SwitchLogicParallelPage() {
  return (
    <DeviceDemoPage
      slug="switch-logic-parallel"
      description="Two switches wired in parallel to one lamp."
    >
      <SwitchLogic wiring="parallel" fixed />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
