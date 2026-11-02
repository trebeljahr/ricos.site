import dynamic from "next/dynamic";
import { whenIdle } from "src/lib/whenIdle";
import { EggTitle } from "../EggTitle";

export const TravelingEgg = dynamic(() => whenIdle().then(() => import("./TravelingEgg")), {
  ssr: false,
  loading: () => <EggTitle text="Traveling Stories" emoji="🌍" label="Globe" />,
});
