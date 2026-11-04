import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import { SignalEdges } from "@components/computer/SignalEdges";

export default function SignalEdgesPage() {
  return (
    <DeviceDemoPage slug="signal-edges" description="Rising and falling edges of a signal.">
      <div className="mx-auto max-w-prose">
        <SignalEdges />
      </div>
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
