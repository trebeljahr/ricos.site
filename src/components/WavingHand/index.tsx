import dynamic from "next/dynamic";
import { HandButton } from "./HandButton";
import { HandEmoji } from "./HandEmoji";

// Defer the motion/react animation chunk until after hydration so the
// motion library doesn't bloat the eager bundle on every page that uses
// the home-page banner. The fallback is an inert button so nothing shifts
// when the animated version swaps in.
const WavingHandAnimated = dynamic(() => import("./WavingHand"), {
  ssr: false,
  loading: () => (
    <HandButton>
      <HandEmoji />
    </HandButton>
  ),
});

export const WavingHand = () => <WavingHandAnimated />;
