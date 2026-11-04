import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import { SwitchStates } from "@components/computer/SwitchStates";

export default function SwitchStatesPage() {
  return (
    <DeviceDemoPage
      slug="switch-states"
      description="Flip switches and see how many states they can hold."
    >
      <div className="mx-auto max-w-4xl">
        <SwitchStates />
      </div>
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
