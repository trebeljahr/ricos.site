import dynamic from "next/dynamic";
import { EggTitle } from "../EggTitle";

export const WebpagesEgg = dynamic(() => import("./WebpagesEgg"), {
  ssr: false,
  loading: () => <EggTitle text="Webpages" emoji="🕸️" label="Spider web" />,
});
