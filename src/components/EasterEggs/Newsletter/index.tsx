import dynamic from "next/dynamic";
import { whenIdle } from "src/lib/whenIdle";
import { EggTitle } from "../EggTitle";

export const NewsletterEgg = dynamic(() => whenIdle().then(() => import("./NewsletterEgg")), {
  ssr: false,
  loading: () => <EggTitle text="Live and Learn Newsletter" emoji="💌" label="Love letter" />,
});
