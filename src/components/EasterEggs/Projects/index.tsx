import dynamic from "next/dynamic";
import { whenIdle } from "src/lib/whenIdle";
import { EggTitle } from "../EggTitle";

export const ProjectsEgg = dynamic(() => whenIdle().then(() => import("./ProjectsEgg")), {
  ssr: false,
  loading: () => <EggTitle text="Projects" emoji="🛠️" label="Tools" />,
});
