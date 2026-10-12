import { StepperDemoPage } from "@components/computer/StepperDemoPage";

export default function CallStackPage() {
  return <StepperDemoPage slug="call-stack" />;
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
