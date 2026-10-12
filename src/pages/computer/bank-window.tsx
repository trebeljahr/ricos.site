import { BankWindowDemo } from "@components/computer/BankWindowDemo";
import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";

export default function BankWindowPage() {
  return (
    <DeviceDemoPage
      slug="bank-window"
      description="A 32×32 screen has 128 bytes. Eight addresses and a BANK register reach all of them, one 8×8 tile at a time."
      intro="A 32×32 screen has 128 bytes. The toy CPU reaches them through 8 data addresses, D0 to D7: a window onto one 8×8 tile. The BANK register at D8 picks the tile. Click a tile, then click pixels in the window."
    >
      <BankWindowDemo />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
