import dynamic from "next/dynamic";
import { whenIdle } from "src/lib/whenIdle";
import { EggTitle } from "../EggTitle";

export type EggPhoto = { tripName: string; image: { src: string; alt?: string } };

export const PhotographyEgg = dynamic(() => whenIdle().then(() => import("./PhotographyEgg")), {
  ssr: false,
  loading: () => <EggTitle text="Photography" emoji="📸" label="Camera" />,
});
