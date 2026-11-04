import { ClockScope } from "@components/computer/ClockScope";
import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";

export default function ClockScopePage() {
  return (
    <DeviceDemoPage slug="clock-scope" description="Watch a clock signal on a scope.">
      <div className="mx-auto max-w-prose">
        <ClockScope />
      </div>
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
