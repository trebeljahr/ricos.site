import { StepperDemoPage } from "@components/computer/StepperDemoPage";

export default function BlitterPage() {
  return <StepperDemoPage slug="blitter" />;
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
