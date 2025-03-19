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
import { SkeletonShield1 } from "@r3f/AllModels/weapons/Skeleton Shield";
import { SkeletonShield2 } from "@r3f/AllModels/weapons/Skeleton Shield-2";
import { SkeletonStaff } from "@r3f/AllModels/weapons/Skeleton Staff";
import { SkeletonArrow } from "@r3f/AllModels/weapons/Skeleton Arrow";
import { SkeletonRogue } from "@r3f/AllModels/enemies/Skeleton Rogue";
import { GLTFResult } from "src/@types";
import { useGLTF } from "@react-three/drei";
import { Bone, Group, Mesh, Object3D } from "three";
import { PropsWithChildren, useEffect, useMemo, useRef } from "react";
import { SkeletonEnemyProps } from "./SkeletonEnemy";
import { pickRandomFromArray } from "src/lib/utils/randomFromArray";

const useSkeletonStaff = () => {
  const result = useGLTF(
    "/3d-assets/glb/weapons/Skeleton Staff-transformed.glb"
  ) as GLTFResult;

  const { nodes } = result;

  const staffMesh = new Mesh(
    nodes.Skeleton_Staff.geometry,
    result.materials.skeleton
  );

  return { staff: staffMesh };
};

const useSword1 = () => {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Sword (1)-transformed.glb"
  ) as GLTFResult;

  const swordMesh = new Mesh(nodes.Sword1.geometry, materials.Material);

  swordMesh.rotation.set(-Math.PI / 2, 0, 0);
  swordMesh.position.set(0, 0.005, 0);
  swordMesh.scale.set(1.2, 1.2, 1.2);

  return { sword: swordMesh };
};

const useSword2 = () => {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Sword (2)-transformed.glb"
  ) as GLTFResult;

  const swordMesh = new Mesh(nodes.Sword1002.geometry, materials.Material);

  swordMesh.rotation.set(-Math.PI / 2, 0, 0);
  swordMesh.position.set(0, 0.005, 0);
  swordMesh.scale.set(1.2, 1.2, 1.2);

  return { sword: swordMesh };
};

const useSword3 = () => {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Sword (3)-transformed.glb"
  ) as GLTFResult;

  const swordMesh = new Mesh(nodes.Sword1001.geometry, materials.Material);

  swordMesh.rotation.set(-Math.PI / 2, 0, 0);
  swordMesh.position.set(0, 0.005, 0);
  swordMesh.scale.set(1.2, 1.2, 1.2);

  return { sword: swordMesh };
};

const useSword4 = () => {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Sword (4)-transformed.glb"
  ) as GLTFResult;

  const swordMesh = new Mesh(nodes.Sword.geometry, materials.Material);

  swordMesh.rotation.set(-Math.PI / 2, 0, 0);
  swordMesh.position.set(0, 0.005, 0);
  swordMesh.scale.set(1.2, 1.2, 1.2);

  return { sword: swordMesh };
};

const useStaff1 = () => {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Staff (1)-transformed.glb"
  ) as GLTFResult;

  console.log("staff", nodes);

  const staffMesh = new Mesh(nodes.Cylinder.geometry, materials["Wood.001"]);

  return { staff: staffMesh };
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

  return { staff: group };
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

  return { staff: group };
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

  return { staff: group };
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

  return { staff: group };
};

const useShield2 = () => {
  const result = useGLTF(
    "/3d-assets/glb/weapons/Skeleton Shield-vS3QC5AvpV-transformed.glb"
  ) as GLTFResult;

  const { nodes } = result;

  const shieldMesh = new Mesh(
    nodes.Skeleton_Shield_Small_B.geometry,
    result.materials.skeleton
  );

  return { shield2: shieldMesh };
};

const useShield = () => {
  const result = useGLTF(
    "/3d-assets/glb/weapons/Skeleton Shield-transformed.glb"
  ) as GLTFResult;

  const { nodes } = result;

  const shieldMesh = new Mesh(
    nodes.Skeleton_Shield_Large_A.geometry,
    result.materials.skeleton
  );

  return { shield: shieldMesh };
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
      return useSword1().sword;
    case SwordTypes.Sword2:
      return useSword2().sword;
    case SwordTypes.Sword3:
      return useSword3().sword;
    case SwordTypes.Sword4:
      return useSword4().sword;
    case StaffTypes.Staff1:
      return useStaff1().staff;
    case StaffTypes.Staff2:
      return useStaff2().staff;
    case StaffTypes.Staff3:
      return useStaff3().staff;
    case StaffTypes.Staff4:
      return useStaff4().staff;
    case StaffTypes.Staff5:
      return useStaff5().staff;
    case ShieldTypes.Shield1:
      return useShield().shield;
    case ShieldTypes.Shield2:
      return useShield2().shield2;
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
}

enum StaffTypes {
  Staff1 = "Staff1",
  Staff2 = "Staff2",
  Staff3 = "Staff3",
  Staff4 = "Staff4",
  Staff5 = "Staff5",
}

enum ShieldTypes {
  Shield1 = "Shield1",
  Shield2 = "Shield2",
}

export const ItemTypes = {
  ...SwordTypes,
  ...StaffTypes,
  ...ShieldTypes,
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
        ItemRight={ItemTypes.Staff2}
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
            position={[index * 5, 0, 0]}
          />
        );
      })}
    </group>
  );
};
