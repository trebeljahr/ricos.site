import dynamic from "next/dynamic";
import { EggTitle } from "../EggTitle";

export type EggPhoto = { tripName: string; image: { src: string; alt?: string } };

export const PhotographyEgg = dynamic(() => import("./PhotographyEgg"), {
  ssr: false,
  loading: () => <EggTitle text="Photography" emoji="📸" label="Camera" />,
});
