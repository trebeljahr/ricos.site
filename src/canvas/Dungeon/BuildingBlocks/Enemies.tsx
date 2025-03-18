import { useEffect } from "react";
import useSound from "use-sound";
import ambientLoop from "@sounds/ambient-pads-loop.mp3";
import { Anne } from "@r3f/AllModels/enemies/Anne";
import { SkeletonWarrior } from "@r3f/AllModels/enemies/Skeleton Warrior";

export const Enemies = () => {
  return (
    <group position={[-20, 0, -20]}>
      <Anne />
      <SkeletonWarrior />
    </group>
  );
};
