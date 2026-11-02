import dynamic from "next/dynamic";
import { whenIdle } from "src/lib/whenIdle";
import { EggTitle } from "../EggTitle";

export const BooknotesEgg = dynamic(() => whenIdle().then(() => import("./BooknotesEgg")), {
  ssr: false,
  loading: () => <EggTitle text="Booknotes" emoji="📚" label="Books" />,
});
