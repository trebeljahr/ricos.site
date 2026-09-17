import dynamic from "next/dynamic";
import { EggTitle } from "../EggTitle";

export const BooknotesEgg = dynamic(() => import("./BooknotesEgg"), {
  ssr: false,
  loading: () => <EggTitle text="Booknotes" emoji="📚" label="Books" />,
});
