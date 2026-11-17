import { GridOfModels } from "@pages/r3f/models/quaternius-models";
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
import { Slime } from "@r3f/AllModels/enemies/Slime Enemy";
import { useControls } from "leva";
import { createContext, useContext, useMemo } from "react";
import { pickRandomFromArray } from "src/lib/utils/randomFromArray";
import { getRandomWeaponType, WeaponTypes } from "../Enemies/Weapons";
import { CommonActions } from "./CommonEnemy";
import { SkeletonTypes, SkeletonWithWeapons } from "./SkeletonEnemy";

// The enemies in the grid are defined once at module level, so a new action
// from the Leva panel re-renders them instead of remounting every model.
const EnemyAction = createContext<CommonActions>(CommonActions.Idle);

const AnneWithAction = () => <AnimatedAnne animationToPlay={useContext(EnemyAction)} />;

const ArmedSkeleton = ({
  skeletonType,
  ItemRight,
  ItemLeft,
}: {
  skeletonType: SkeletonTypes;
  ItemRight: WeaponTypes;
  ItemLeft: WeaponTypes;
}) => (
  <SkeletonWithWeapons
    skeletonType={skeletonType}
    animationToPlay={useContext(EnemyAction)}
    ItemRight={ItemRight}
    ItemLeft={ItemLeft}
  />
);

const enemys = {
  Anne: AnneWithAction,
  SkeletonWarrior: () => (
    <ArmedSkeleton
      skeletonType={SkeletonTypes.Warrior}
      ItemRight={WeaponTypes.Sword5}
      ItemLeft={WeaponTypes.Sword5}
    />
  ),
  SkeletonMage: () => (
    <ArmedSkeleton
      skeletonType={SkeletonTypes.Mage}
      ItemRight={WeaponTypes.Bow1}
      ItemLeft={WeaponTypes.Bow1}
    />
  ),
  SkeletonMinion: () => (
    <ArmedSkeleton
      skeletonType={SkeletonTypes.Minion}
      ItemRight={WeaponTypes.Staff5}
      ItemLeft={WeaponTypes.Staff5}
    />
  ),
  SkeletonRogue: () => (
    <ArmedSkeleton
      skeletonType={SkeletonTypes.Rogue}
      ItemRight={WeaponTypes.Sword4}
      ItemLeft={WeaponTypes.Shield1}
    />
  ),
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

export const Enemies = () => {
  const { currentAction } = useControls({
    currentAction: {
      value: CommonActions.Idle,
      options: CommonActions,
    },
  });

  const skeletonTypes = useMemo(
    () =>
      Array.from({ length: 10 }, () => {
        const skeletonType = pickRandomFromArray(Object.values(SkeletonTypes));
        const itemLeft = getRandomWeaponType();
        const itemRight = getRandomWeaponType();
        return {
          skeletonType,
          itemLeft,
          itemRight,
        };
      }),
    [],
  );

  return (
    <group position={[-30, 0, -50]} scale={0.8}>
      <EnemyAction.Provider value={currentAction}>
        <GridOfModels assets={enemys} rotation={[0, Math.PI, 0]} />
      </EnemyAction.Provider>
      {skeletonTypes.map(({ skeletonType, itemLeft, itemRight }, index) => {
        return (
          <SkeletonWithWeapons
            // biome-ignore lint/suspicious/noArrayIndexKey: stable list rendered once, no reorder
            key={index}
            skeletonType={skeletonType}
            ItemLeft={itemLeft}
            ItemRight={itemRight}
            animationToPlay={currentAction}
            position={[-10, 0, 2 + index * 5]}
            rotation={[0, Math.PI / 2, 0]}
          />
        );
      })}
    </group>
  );
};
