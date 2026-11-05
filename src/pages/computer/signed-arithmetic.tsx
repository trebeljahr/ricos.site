import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import { SignedArithmetic } from "@components/computer/SignedArithmetic";

export default function SignedArithmeticPage() {
  return (
    <DeviceDemoPage slug="signed-arithmetic" description="Add and subtract signed numbers by hand.">
      <SignedArithmetic />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
