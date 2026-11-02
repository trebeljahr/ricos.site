import dynamic from "next/dynamic";
import { whenIdle } from "src/lib/whenIdle";
import { EggTitle } from "../EggTitle";

export const WritingEgg = dynamic(() => whenIdle().then(() => import("./WritingEgg")), {
  ssr: false,
  loading: () => <EggTitle text="Writing" emoji="📝" label="Memo" />,
});
