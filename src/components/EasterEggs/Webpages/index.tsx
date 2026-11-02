import dynamic from "next/dynamic";
import { whenIdle } from "src/lib/whenIdle";
import { EggTitle } from "../EggTitle";

export const WebpagesEgg = dynamic(() => whenIdle().then(() => import("./WebpagesEgg")), {
  ssr: false,
  loading: () => <EggTitle text="Webpages" emoji="🕸️" label="Spider web" />,
});
