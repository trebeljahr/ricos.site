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
import { SkeletonRogue } from "@r3f/AllModels/enemies/Skeleton Rogue";
import { SkeletonWarrior } from "@r3f/AllModels/enemies/Skeleton Warrior";
import { Slime } from "@r3f/AllModels/enemies/Slime Enemy";
import { SkeletonArrow } from "@r3f/AllModels/weapons/Skeleton Arrow";
import { SkeletonShield1 } from "@r3f/AllModels/weapons/Skeleton Shield-1";
import { SkeletonShield2 } from "@r3f/AllModels/weapons/Skeleton Shield-2";
import { SkeletonStaff } from "@r3f/AllModels/weapons/Staff (6)";
import { useGLTF } from "@react-three/drei";
import { useControls } from "leva";
import { useEffect, useMemo, useRef } from "react";
import { GLTFResult } from "src/@types";
import { pickRandomFromArray } from "src/lib/utils/randomFromArray";
import { Bone, Group, Mesh, Object3D } from "three";
import { CommonActions } from "./CommonEnemy";
import { SkeletonEnemyProps } from "./SkeletonEnemy";
import { SkeletonCrossbow } from "@r3f/AllModels/weapons/Crossbow";
import { MagicWand } from "@r3f/AllModels/weapons/Magick wand";
import { SkeletonAxe } from "@r3f/AllModels/weapons/Axe";
import { SkeletonBlade } from "@r3f/AllModels/weapons/Blade";
import { SkeletonQuiver } from "@r3f/AllModels/weapons/Quiver";

const useSword1 = () => {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Sword (1)-transformed.glb"
  ) as GLTFResult;

  const swordMesh = new Mesh(nodes.Sword1.geometry, materials.Material);

  swordMesh.rotation.set(-Math.PI / 2, 0, 0);
  swordMesh.position.set(0, 0.005, 0);
  swordMesh.scale.set(1.2, 1.2, 1.2);

  return swordMesh;
};

const useSword2 = () => {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Sword (2)-transformed.glb"
  ) as GLTFResult;

  const swordMesh = new Mesh(nodes.Sword1002.geometry, materials.Material);

  swordMesh.rotation.set(-Math.PI / 2, 0, 0);
  swordMesh.position.set(0, 0.005, 0);
  swordMesh.scale.set(1.2, 1.2, 1.2);

  return swordMesh;
};

const useSword3 = () => {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Sword (3)-transformed.glb"
  ) as GLTFResult;

  const swordMesh = new Mesh(nodes.Sword1001.geometry, materials.Material);

  swordMesh.rotation.set(-Math.PI / 2, 0, 0);
  swordMesh.position.set(0, 0.005, 0);
  swordMesh.scale.set(1.2, 1.2, 1.2);

  return swordMesh;
};

const useSword4 = () => {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Sword (4)-transformed.glb"
  ) as GLTFResult;

  const swordMesh = new Mesh(nodes.Sword.geometry, materials.Material);

  swordMesh.rotation.set(-Math.PI / 2, 0, 0);
  swordMesh.position.set(0, 0.005, 0);
  swordMesh.scale.set(1.2, 1.2, 1.2);

  return swordMesh;
};

const useSword5 = () => {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Blade-transformed.glb"
  ) as GLTFResult;

  const swordMesh = new Mesh(nodes.Skeleton_Blade.geometry, materials.skeleton);

  swordMesh.rotation.set(0, Math.PI, 0);
  return swordMesh;
};

const useAxe1 = () => {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Axe-transformed.glb"
  ) as GLTFResult;

  const axeMesh = new Mesh(nodes.Skeleton_Axe.geometry, materials.skeleton);

  return axeMesh;
};

const useBow1 = () => {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Crossbow-transformed.glb"
  ) as GLTFResult;

  const crossbowMesh = new Mesh(
    nodes.Skeleton_Crossbow.geometry,
    materials.skeleton
  );

  crossbowMesh.rotation.set(-Math.PI / 2, 0, Math.PI / 2);

  return crossbowMesh;
};

const useStaff1 = () => {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Staff (1)-transformed.glb"
  ) as GLTFResult;

  const staffMesh = new Mesh(nodes.Cylinder.geometry, materials["Wood.001"]);

  return staffMesh;
};

const useStaff2 = () => {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Staff (2)-transformed.glb"
  ) as GLTFResult;

  const group = new Group();
  group.name = "Staff_2";

  const staffMesh = new Mesh(
    nodes["Staff_02_Circle001-Mesh"].geometry,
    materials.Iron_staff_02
  );

  const staffMesh2 = new Mesh(
    nodes["Staff_02_Circle001-Mesh_1"].geometry,
    materials.Wood_staff_02
  );

  const staffMesh3 = new Mesh(
    nodes["Staff_02_Circle001-Mesh_2"].geometry,
    materials.Green_crystal
  );

  const staffMesh4 = new Mesh(
    nodes["Staff_02_Circle001-Mesh_3"].geometry,
    materials.Purple_ribbon
  );

  group.add(staffMesh);
  group.add(staffMesh2);
  group.add(staffMesh3);
  group.add(staffMesh4);

  group.scale.set(0.003, 0.003, 0.003);
  group.position.set(-0.002, 0.008, 0);

  return group;
};

const useStaff3 = () => {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Staff (3)-transformed.glb"
  ) as GLTFResult;

  const group = new Group();
  group.name = "Staff_3";

  const staffMesh = new Mesh(
    nodes["Staff_03_Cube-Mesh"].geometry,
    materials.Iron_sword
  );

  const staffMesh2 = new Mesh(
    nodes["Staff_03_Cube-Mesh_1"].geometry,
    materials.Golden
  );

  const staffMesh3 = new Mesh(
    nodes["Staff_03_Cube-Mesh_2"].geometry,
    materials.Ball_staff_03
  );

  group.add(staffMesh);
  group.add(staffMesh2);
  group.add(staffMesh3);

  group.scale.set(0.003, 0.003, 0.003);
  group.position.set(0, 0.008, 0);

  return group;
};

const useStaff4 = () => {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Staff (4)-transformed.glb"
  ) as GLTFResult;

  const group = new Group();
  group.name = "Staff_4";

  const staffMesh = new Mesh(
    nodes["Staff_04_Circle011-Mesh"].geometry,
    materials.Dark_blue
  );

  const staffMesh2 = new Mesh(
    nodes["Staff_04_Circle011-Mesh_1"].geometry,
    materials.Iron_staff_04
  );

  const staffMesh3 = new Mesh(
    nodes["Staff_04_Circle011-Mesh_2"].geometry,
    materials.Cyrstal_staff_04
  );

  group.add(staffMesh);
  group.add(staffMesh2);
  group.add(staffMesh3);

  group.scale.set(0.003, 0.003, 0.003);
  group.position.set(0, 0.005, 0);

  return group;
};

const useStaff5 = () => {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Staff (5)-transformed.glb"
  ) as GLTFResult;

  const group = new Group();
  group.name = "Staff_5";

  const staffMesh = new Mesh(
    nodes["Staff_05_Circle016-Mesh"].geometry,
    materials.Brown
  );
  const staffMesh2 = new Mesh(
    nodes["Staff_05_Circle016-Mesh_1"].geometry,
    materials.Moon
  );

  const staffMesh3 = new Mesh(
    nodes["Staff_05_Circle016-Mesh_2"].geometry,
    materials.Spikes
  );

  group.add(staffMesh);
  group.add(staffMesh2);
  group.add(staffMesh3);

  group.scale.set(0.003, 0.003, 0.003);
  group.position.set(0, 0.007, 0.001);

  return group;
};

const useStaff6 = () => {
  const result = useGLTF(
    "/3d-assets/glb/weapons/Skeleton Staff-transformed.glb"
  ) as GLTFResult;

  const { nodes } = result;

  const staffMesh = new Mesh(
    nodes.Skeleton_Staff.geometry,
    result.materials.skeleton
  );

  return staffMesh;
};

const useStaff7 = () => {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Magick wand-transformed.glb"
  ) as GLTFResult;

  const group = new Group();
  group.name = "Staff_7";
  const staffMesh = new Mesh(nodes["group1762687703"].geometry, materials.mat2);
  const staffMesh2 = new Mesh(
    nodes["mesh2096346305"].geometry,
    materials.mat20
  );
  const staffMesh3 = new Mesh(
    nodes["mesh2096346305_1"].geometry,
    materials.mat17
  );

  group.scale.set(0.02, 0.02, 0.02);
  group.position.set(0, 0.005, 0);

  group.add(staffMesh);
  group.add(staffMesh2);
  group.add(staffMesh3);

  return group;
};

const useShield = () => {
  const result = useGLTF(
    "/3d-assets/glb/weapons/Skeleton Shield-1-transformed.glb"
  ) as GLTFResult;

  const { nodes } = result;

  const shieldMesh = new Mesh(
    nodes.Skeleton_Shield_Large_A.geometry,
    result.materials.skeleton
  );

  return shieldMesh;
};

const useShield2 = () => {
  const result = useGLTF(
    "/3d-assets/glb/weapons/Skeleton Shield-2-transformed.glb"
  ) as GLTFResult;

  const { nodes } = result;

  const shieldMesh = new Mesh(
    nodes.Skeleton_Shield_Small_B.geometry,
    result.materials.skeleton
  );

  return shieldMesh;
};

const useShield3 = () => {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Skeleton Shield-3-transformed.glb"
  ) as GLTFResult;

  const shieldMesh = new Mesh(
    nodes.Skeleton_Shield_Small_A.geometry,
    materials.skeleton
  );

  return shieldMesh;
};

const useShield4 = () => {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Skeleton Shield-4-transformed.glb"
  ) as GLTFResult;

  const shieldMesh = new Mesh(
    nodes.Skeleton_Shield_Large_B.geometry,
    materials.skeleton
  );

  return shieldMesh;
};

const getRandomItemType = () => {
  const itemTypes = Object.values(ItemTypes);
  const randomItemType = pickRandomFromArray(itemTypes);
  return randomItemType;
};

const useRandomItem = () => {
  const item = useItem(getRandomItemType());
  return item;
};

const useItem = (itemType: ItemTypes) => {
  switch (itemType) {
    case SwordTypes.Sword1:
      return useSword1();
    case SwordTypes.Sword2:
      return useSword2();
    case SwordTypes.Sword3:
      return useSword3();
    case SwordTypes.Sword4:
      return useSword4();
    case SwordTypes.Sword5:
      return useSword5();
    case AxeTypes.Axe1:
      return useAxe1();
    case BowTypes.Bow1:
      return useBow1();
    case StaffTypes.Staff1:
      return useStaff1();
    case StaffTypes.Staff2:
      return useStaff2();
    case StaffTypes.Staff3:
      return useStaff3();
    case StaffTypes.Staff4:
      return useStaff4();
    case StaffTypes.Staff5:
      return useStaff5();
    case StaffTypes.Staff6:
      return useStaff6();
    case StaffTypes.Staff7:
      return useStaff7();
    case ShieldTypes.Shield1:
      return useShield();
    case ShieldTypes.Shield2:
      return useShield2();
    case ShieldTypes.Shield3:
      return useShield3();
    case ShieldTypes.Shield4:
      return useShield4();
  }
};

enum SkeletonTypes {
  Rogue = "Rogue",
  Warrior = "Warrior",
  Mage = "Mage",
  Minion = "Minion",
}

enum SwordTypes {
  Sword1 = "Sword1",
  Sword2 = "Sword2",
  Sword3 = "Sword3",
  Sword4 = "Sword4",
  Sword5 = "Sword5",
}

enum StaffTypes {
  Staff1 = "Staff1",
  Staff2 = "Staff2",
  Staff3 = "Staff3",
  Staff4 = "Staff4",
  Staff5 = "Staff5",
  Staff6 = "Staff6",
  Staff7 = "Staff7",
}

enum AxeTypes {
  Axe1 = "Axe1",
}

enum BowTypes {
  Bow1 = "Bow1",
}

enum ShieldTypes {
  Shield1 = "Shield1",
  Shield2 = "Shield2",
  Shield3 = "Shield3",
  Shield4 = "Shield4",
}

export const ItemTypes = {
  ...SwordTypes,
  ...StaffTypes,
  ...ShieldTypes,
  ...BowTypes,
  ...AxeTypes,
};
export type ItemTypes = (typeof ItemTypes)[keyof typeof ItemTypes];

export const SkeletonWithWeapons = ({
  ItemRight: ProvidedItemRight,
  ItemLeft: ProvidedItemLeft,
  skeletonType = SkeletonTypes.Warrior,
  animationToPlay = CommonActions.Idle,
  ...props
}: SkeletonEnemyProps & {
  ItemRight: ItemTypes;
  ItemLeft: ItemTypes;
  skeletonType?: SkeletonTypes;
}) => {
  const itemRight = useItem(ProvidedItemRight);
  const itemLeft = useItem(ProvidedItemLeft);

  const groupRef = useRef<Group>(null!);

  useEffect(() => {
    let leftHand: Object3D<Bone>;
    let rightHand: Object3D<Bone>;
    groupRef.current.traverse((child) => {
      if (child.name === "handslotl" && itemLeft) {
        child.add(itemLeft);
        leftHand = child as Object3D<Bone>;
      }
      if (child.name === "handslotr" && itemRight) {
        child.add(itemRight);

        rightHand = child as Object3D<Bone>;
      }
    });

    return () => {
      if (leftHand && itemLeft) {
        leftHand.remove(itemLeft);
      }
      if (rightHand && itemRight) {
        rightHand.remove(itemRight);
      }
    };
  }, [itemLeft, itemRight]);

  const SkeletonOfType = useMemo(() => {
    switch (skeletonType) {
      case SkeletonTypes.Rogue:
        return SkeletonRogue;
      case SkeletonTypes.Warrior:
        return SkeletonWarrior;
      case SkeletonTypes.Mage:
        return SkeletonMage;
      case SkeletonTypes.Minion:
        return SkeletonMinion;
      default:
        return SkeletonWarrior;
    }
  }, [skeletonType]);

  return (
    <group ref={groupRef}>
      <SkeletonOfType animationToPlay={animationToPlay} {...props} />
    </group>
  );
};

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
        ItemRight={ItemTypes.Sword1}
        ItemLeft={ItemTypes.Sword2}
      />
    ),
    SkeletonMage: () => (
      <SkeletonWithWeapons
        skeletonType={SkeletonTypes.Mage}
        animationToPlay={currentAction}
        ItemRight={ItemTypes.Sword5}
        ItemLeft={ItemTypes.Shield1}
      />
    ),
    SkeletonMinion: () => (
      <SkeletonWithWeapons
        skeletonType={SkeletonTypes.Minion}
        animationToPlay={currentAction}
        ItemRight={ItemTypes.Sword3}
        ItemLeft={ItemTypes.Shield2}
      />
    ),
    SkeletonRogue: () => (
      <SkeletonWithWeapons
        skeletonType={SkeletonTypes.Rogue}
        animationToPlay={currentAction}
        ItemRight={ItemTypes.Sword4}
        ItemLeft={ItemTypes.Shield1}
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
    SkeletonShield1,
    SkeletonShield2,
    SkeletonStaff,
    SkeletonArrow,
    SkeletonCrossbow,
    MagicWand,
    SkeletonAxe,
    SkeletonBlade,
    SkeletonQuiver,
  };

  const skeletonTypes = useMemo(
    () =>
      Array.from({ length: 10 }, () => {
        const skeletonType = pickRandomFromArray(Object.values(SkeletonTypes));
        const itemLeft = getRandomItemType();
        const itemRight = getRandomItemType();
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
