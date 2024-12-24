"use client";
import { lazy, Suspense } from "react";
import { HandEmoji } from "./_Component";

const WavingHandComponent = lazy(() => import("./_Component"));

export const WavingHand = () => {
  return (
    <Suspense fallback={<HandEmoji />}>
      <WavingHandComponent />
    </Suspense>
  );
};
