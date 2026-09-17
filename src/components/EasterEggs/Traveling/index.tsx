import dynamic from "next/dynamic";
import { EggTitle } from "../EggTitle";

export const TravelingEgg = dynamic(() => import("./TravelingEgg"), {
  ssr: false,
  loading: () => <EggTitle text="Traveling Stories" emoji="🌍" label="Globe" />,
});
