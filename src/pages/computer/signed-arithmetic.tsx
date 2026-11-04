import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import { SignedArithmetic } from "@components/computer/SignedNumbers";

export default function SignedArithmeticPage() {
  return (
    <DeviceDemoPage slug="signed-arithmetic" description="Add signed numbers with the same adder.">
      <SignedArithmetic />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
