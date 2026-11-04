import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import { SevenSegmentDecoder } from "@components/computer/SevenSegmentDecoder";
import Link from "next/link";

export default function SevenSegmentPage() {
  return (
    <DeviceDemoPage
      slug="seven-segment"
      description="Set four bits and follow them through the gates to the bars of a digit."
    >
      <p>
        <Link href="/computer/build-from-nand?level=bcd-seven-segment">
          Build and check this circuit yourself →
        </Link>
      </p>
      <SevenSegmentDecoder />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
