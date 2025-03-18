import {
  Armor_Black,
  Armor_Golden,
  Armor_Leather,
  Armor_Metal,
  Armor_Metal2,
} from "@r3f/AllModels/rpg_items_pack";
import { GroupProps } from "@react-three/fiber";
import { useMemo } from "react";
import { pickRandomFromArray } from "src/lib/utils/randomFromArray";
import {
  Collectible,
  ItemSpawner,
  Rarity,
  SpawnerImplementation,
} from "./ItemSpawner";

enum ArmorTypes {
  Leather = "Leather",
  Metal = "Metal",
  Black = "Black",
  Golden = "Golden",
  Metal2 = "Metal2",
}

type ArmorData = {
  defense: number;
  durability: number;
  rarity: Rarity;
  type: ArmorTypes;
};

export const RandomArmorSpawner: SpawnerImplementation = (props) => {
  const Armor: Collectible<ArmorData> = useMemo(() => {
    return pickRandomFromArray(armorTypes);
  }, []);

  const onCollected = (data: any) => {
    console.log(data);
  };
  return (
    <ItemSpawner
      Item={Armor.Component}
      {...props}
      onCollected={onCollected}
      data={Armor.data}
    />
  );
};

const armorTypes = [
  {
    Component: (props: GroupProps) => (
      <Armor_Black position={[0, 0.5, 0]} {...props} />
    ),
    data: {
      defense: 10,
      durability: 10,
      rarity: Rarity.Medium,
      type: ArmorTypes.Black,
    },
  },
  {
    Component: (props: GroupProps) => (
      <Armor_Golden position={[0, 0.5, 0]} {...props} />
    ),
    data: {
      defense: 10,
      durability: 10,
      rarity: Rarity.Medium,
      type: ArmorTypes.Golden,
    },
  },
  {
    Component: (props: GroupProps) => (
      <Armor_Leather position={[0, 0.5, 0]} {...props} />
    ),
    data: {
      defense: 10,
      durability: 10,
      rarity: Rarity.Medium,
      type: ArmorTypes.Leather,
    },
  },
  {
    Component: (props: GroupProps) => (
      <Armor_Metal position={[0, 0.5, 0]} {...props} />
    ),
    data: {
      defense: 10,
      durability: 10,
      rarity: Rarity.Medium,
      type: ArmorTypes.Metal,
    },
  },
  {
    Component: (props: GroupProps) => (
      <Armor_Metal2 position={[0, 0.5, 0]} {...props} />
    ),
    data: {
      defense: 10,
      durability: 10,
      rarity: Rarity.Medium,
      type: ArmorTypes.Metal2,
    },
  },
];
