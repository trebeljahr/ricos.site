"use client";
import { lazy, Suspense } from "react";
import { HandEmoji } from "./WavingHand";

const WavingHandComponent = lazy(() => import("./WavingHand"));

export const WavingHand = () => {
  return (
    <Suspense fallback={<HandEmoji />}>
      <WavingHandComponent />
    </Suspense>
  );
};
