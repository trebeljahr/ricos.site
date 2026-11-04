import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import { GateWirings } from "@components/computer/GateWirings";

export default function GateWiringsPage() {
  return (
    <DeviceDemoPage slug="gate-wirings" description="Wire one gate five ways.">
      <div className="mx-auto max-w-3xl">
        <GateWirings />
      </div>
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
