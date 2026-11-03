import { BankWindowDemo } from "@components/computer/BankWindowDemo";
import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";

export default function BankWindowPage() {
  return (
    <DeviceDemoPage
      slug="bank-window"
      description="A 32×32 screen has 128 bytes. Eight addresses and a BANK register reach all of them, one 8×8 tile at a time."
    >
      <BankWindowDemo />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
