import { ClockFacts } from "@components/computer/ClockFacts";
import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";

export default function ClockFactsPage() {
  return (
    <DeviceDemoPage slug="clock-facts" description="One clock speed in numbers you know.">
      <div className="mx-auto max-w-prose">
        <ClockFacts />
      </div>
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
