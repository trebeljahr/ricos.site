import { GridOfModels } from "@pages/r3f/all-models";
import { AnimatedAnne } from "@r3f/AllModels/enemies/Anne";
import { Bat } from "@r3f/AllModels/enemies/Bat";
import { Matt } from "@r3f/AllModels/enemies/Characters Matt";
import { Collosus } from "@r3f/AllModels/enemies/Colossus pre Tilt Brush";
import { Dragon } from "@r3f/AllModels/enemies/Dragon";
import { DragonAnimated } from "@r3f/AllModels/enemies/Dragon (1)";
import { DragonEvolved } from "@r3f/AllModels/enemies/Dragon Evolved";
import { GhostSkull } from "@r3f/AllModels/enemies/Ghost Skull";
import { Robot } from "@r3f/AllModels/enemies/Rigged robot";
import { RobertDinosaur } from "@r3f/AllModels/enemies/Robert";
import { Shark } from "@r3f/AllModels/enemies/Shark";
import { Sharky } from "@r3f/AllModels/enemies/Sharky";
import { Skeleton } from "@r3f/AllModels/enemies/Skeleton";
import { SkeletonWithoutHead } from "@r3f/AllModels/enemies/Skeleton (1)";
import { SkeletonUnarmed } from "@r3f/AllModels/enemies/Skeleton (2)";
import { SkeletonMage } from "@r3f/AllModels/enemies/Skeleton Mage";
import { SkeletonMinion } from "@r3f/AllModels/enemies/Skeleton Minion";
import { SkeletonWarrior } from "@r3f/AllModels/enemies/Skeleton Warrior";
import { Slime } from "@r3f/AllModels/enemies/Slime Enemy";
import { useControls } from "leva";
import { CommonActions } from "./CommonEnemy";
import { SkeletonRogue } from "./SkeletonEnemy";

export const Enemies = () => {
  const { currentAction } = useControls({
    currentAction: {
      value: CommonActions.Idle,
      options: CommonActions,
    },
  });

  const enemys = {
    Anne: () => <AnimatedAnne animationToPlay={currentAction} />,
    SkeletonWarrior,
    SkeletonMage: () => <SkeletonMage animationToPlay={currentAction} />,
    SkeletonMinion: () => <SkeletonMinion animationToPlay={currentAction} />,
    SkeletonRogue: () => <SkeletonRogue animationToPlay={currentAction} />,
    Skeleton,
    SkeletonWithoutHead,
    GhostSkull,
    Collosus,
    Bat,
    SkeletonUnarmed: () => <SkeletonUnarmed scale={0.3} />,
    Slime: () => <Slime scale={30} />,
    DragonAnimated,
    DragonEvolved,
    Matt,
    Sharky,
    Shark,
    RobertDinosaur: () => <RobertDinosaur scale={0.4} position={[0, 3, 0]} />,
    Dragon: () => <Dragon scale={0.02} position={[0, 3, 0]} />,
    Robot,
  };

  return (
    <group position={[-30, 0, -50]}>
      <GridOfModels assets={enemys} rotation={[0, Math.PI, 0]} />
    </group>
  );
};
