import dynamic from "next/dynamic";
import { EggTitle } from "../EggTitle";

export const SearchPartyEgg = dynamic(() => import("./SearchPartyEgg"), {
  ssr: false,
  loading: () => <EggTitle text="404 - Page Not Found" emoji="🔍" label="Magnifying glass" />,
});
