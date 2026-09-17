import dynamic from "next/dynamic";
import { EggTitle } from "../EggTitle";

export const NewsletterEgg = dynamic(() => import("./NewsletterEgg"), {
  ssr: false,
  loading: () => <EggTitle text="Live and Learn Newsletter" emoji="💌" label="Love letter" />,
});
