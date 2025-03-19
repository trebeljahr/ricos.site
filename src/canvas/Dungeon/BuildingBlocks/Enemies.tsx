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
import { Slime } from "@r3f/AllModels/enemies/Slime Enemy";
import { SkeletonAxe } from "@r3f/AllModels/weapons/Axe";
import { SkeletonBlade } from "@r3f/AllModels/weapons/Blade";
import { SkeletonCrossbow } from "@r3f/AllModels/weapons/Crossbow";
import { MagicWand } from "@r3f/AllModels/weapons/Magick wand";
import { SkeletonQuiver } from "@r3f/AllModels/weapons/Quiver";
import { SkeletonArrow } from "@r3f/AllModels/weapons/Skeleton Arrow";
import { SkeletonShield1 } from "@r3f/AllModels/weapons/Skeleton Shield-1";
import { SkeletonShield2 } from "@r3f/AllModels/weapons/Skeleton Shield-2";
import { SkeletonStaff } from "@r3f/AllModels/weapons/Staff (6)";
import { useControls } from "leva";
import { useMemo } from "react";
import { pickRandomFromArray } from "src/lib/utils/randomFromArray";
import { getRandomWeaponType, WeaponTypes } from "../Enemies/Weapons";
import { CommonActions } from "./CommonEnemy";
import { SkeletonTypes, SkeletonWithWeapons } from "./SkeletonEnemy";

export const Enemies = () => {
  const { currentAction } = useControls({
    currentAction: {
      value: CommonActions.Idle,
      options: CommonActions,
    },
  });

  const enemys = {
    Anne: () => <AnimatedAnne animationToPlay={currentAction} />,
    SkeletonWarrior: () => (
      <SkeletonWithWeapons
        skeletonType={SkeletonTypes.Warrior}
        animationToPlay={currentAction}
        ItemRight={WeaponTypes.Sword5}
        ItemLeft={WeaponTypes.Sword5}
      />
    ),
    SkeletonMage: () => (
      <SkeletonWithWeapons
        skeletonType={SkeletonTypes.Mage}
        animationToPlay={currentAction}
        ItemRight={WeaponTypes.Bow1}
        ItemLeft={WeaponTypes.Bow1}
      />
    ),
    SkeletonMinion: () => (
      <SkeletonWithWeapons
        skeletonType={SkeletonTypes.Minion}
        animationToPlay={currentAction}
        ItemRight={WeaponTypes.Staff5}
        ItemLeft={WeaponTypes.Staff5}
      />
    ),
    SkeletonRogue: () => (
      <SkeletonWithWeapons
        skeletonType={SkeletonTypes.Rogue}
        animationToPlay={currentAction}
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
    // SkeletonShield1,
    // SkeletonShield2,
    // SkeletonStaff,
    // SkeletonArrow,
    // SkeletonCrossbow,
    // MagicWand,
    // SkeletonAxe,
    // SkeletonBlade,
    // SkeletonQuiver,
  };

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
    []
  );

  return (
    <group position={[-30, 0, -50]}>
      <GridOfModels assets={enemys} rotation={[0, Math.PI, 0]} />
      {skeletonTypes.map(({ skeletonType, itemLeft, itemRight }, index) => {
        return (
          <SkeletonWithWeapons
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
