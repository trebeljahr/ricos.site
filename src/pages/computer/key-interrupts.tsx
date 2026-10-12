import { StepperDemoPage } from "@components/computer/StepperDemoPage";

export default function KeyInterruptsPage() {
  return <StepperDemoPage slug="key-interrupts" />;
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
