import dynamic from "next/dynamic";
import { EggTitle } from "../EggTitle";

export const WritingEgg = dynamic(() => import("./WritingEgg"), {
  ssr: false,
  loading: () => <EggTitle text="Writing" emoji="📝" label="Memo" />,
});
