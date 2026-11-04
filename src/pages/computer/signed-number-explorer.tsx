import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import { SignedNumberExplorer } from "@components/computer/SignedNumbers";

export default function SignedNumberExplorerPage() {
  return (
    <DeviceDemoPage slug="signed-number-explorer" description="Read a byte as a signed number.">
      <SignedNumberExplorer />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
