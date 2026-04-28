import dynamic from "next/dynamic";
import { HandEmoji } from "./HandEmoji";

// Defer the motion/react animation chunk until after hydration so the
// motion library doesn't bloat the eager bundle on every page that uses
// the home-page banner.
const WavingHandAnimated = dynamic(() => import("./WavingHand"), {
  ssr: false,
  loading: () => <HandEmoji />,
});

export const WavingHand = () => <WavingHandAnimated />;
