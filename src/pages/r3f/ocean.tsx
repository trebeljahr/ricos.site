import { CanvasWithKeyboardInput } from "src/canvas/Controllers/KeyboardControls";
import { ThreeFiberLayout } from "@components/dom/Layout";
import { UnderwaterContextProvider } from "@contexts/UnderwaterContext";
import dynamic from "next/dynamic";
import tunnel from "tunnel-rat";

const WaterDemo = dynamic(
  () => import("src/canvas/OceanDemo/WaterDemo"),
  {
    ssr: false,
  }
);

export const { In, Out } = tunnel();

export default function Page() {
  return (
    <ThreeFiberLayout>
      <Out />
      <CanvasWithKeyboardInput>
        <UnderwaterContextProvider>
          <WaterDemo />
        </UnderwaterContextProvider>
      </CanvasWithKeyboardInput>
    </ThreeFiberLayout>
  );
}

export async function getStaticProps() {
  return { props: { title: "Ocean Demo" } };
}
