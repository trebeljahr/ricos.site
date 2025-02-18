import { CanvasWithControls } from "@components/canvas/Scene";
import { ThreeFiberLayout } from "@components/dom/Layout";
import { UnderwaterContextProvider } from "@contexts/UnderwaterContext";
import dynamic from "next/dynamic";
import tunnel from "tunnel-rat";

const WaterDemo = dynamic(() => import("@components/canvas/WaterDemo"), {
  ssr: false,
});

export const { In, Out } = tunnel();

export default function Page() {
  return (
    <ThreeFiberLayout>
      <Out />
      <CanvasWithControls>
        <UnderwaterContextProvider>
          <WaterDemo />
        </UnderwaterContextProvider>
      </CanvasWithControls>
    </ThreeFiberLayout>
  );
}

export async function getStaticProps() {
  return { props: { title: "Ocean Demo" } };
}
