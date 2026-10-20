import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import { MemoryMappedScreenDemo } from "@components/computer/MemoryMappedScreenDemo";

export default function MemoryMappedScreenPage() {
  return (
    <DeviceDemoPage
      slug="memory-mapped-screen"
      description="The toy CPU's 8×8 screen is 8 bytes at data addresses F0 to F7. A store to one of them draws a row of pixels."
      intro="Drive the device through the CPU's memory bus. Set an address and a byte, store on a clock edge, then open the blocks to follow the gates."
    >
      <MemoryMappedScreenDemo />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
