import dynamic from "next/dynamic";
import { whenIdle } from "src/lib/whenIdle";
import { EggTitle } from "../EggTitle";

export const CreativeCodingEgg = dynamic(
  () => whenIdle().then(() => import("./CreativeCodingEgg")),
  {
    ssr: false,
    loading: () => <EggTitle text="Creative Coding" emoji="🎨" label="Palette" />,
  },
);
