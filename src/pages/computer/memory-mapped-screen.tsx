import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import { MemoryMappedScreenDemo } from "@components/computer/MemoryMappedScreenDemo";

export default function MemoryMappedScreenPage() {
  return (
    <DeviceDemoPage
      slug="memory-mapped-screen"
      description="The toy CPU's 8×8 screen is 8 bytes at data addresses F0 to F7. A store to one of them draws a row of pixels."
      intro="The 8×8 screen is 8 bytes of memory at data addresses F0 to F7. Each byte is one row, and each bit is one pixel. The CPU draws with an instruction it already has: a store. Click pixels, or pick a row and move the byte slider."
    >
      <MemoryMappedScreenDemo />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
