import dynamic from "next/dynamic";
import { EggTitle } from "../EggTitle";

export const CreativeCodingEgg = dynamic(() => import("./CreativeCodingEgg"), {
  ssr: false,
  loading: () => <EggTitle text="Creative Coding" emoji="🎨" label="Palette" />,
});
