import dynamic from "next/dynamic";
import { EggTitle } from "../EggTitle";

export const ProjectsEgg = dynamic(() => import("./ProjectsEgg"), {
  ssr: false,
  loading: () => <EggTitle text="Projects" emoji="🛠️" label="Tools" />,
});
