import {
  Axe_Double,
  Axe_Double_Golden,
  Axe_small,
  Axe_small_Golden,
  Bow_Golden,
  Bow_Wooden,
  Dagger,
  Dagger_Golden,
  Sword,
  Sword_big,
  Sword_big_Golden,
  Sword_Golden,
} from "@r3f/models/rpg_items_pack/";
import { useMemo } from "react";
import { pickRandomFromArray } from "src/lib/utils/randomFromArray";
import {
  Collectible,
  ItemSpawner,
  Rarity,
  SpawnerImplementation,
} from "./ItemSpawner";

enum WeaponTypes {
  Sword,
  Sword_Big,
  Axe,
  DoubleAxe,
  Bow,
  Dagger,
}

type WeaponData = {
  type: WeaponTypes;
  rarity: Rarity;
  damage: number;
};

export const RandomWeaponsSpawner: SpawnerImplementation = (props) => {
  const Weapon: Collectible<WeaponData> = useMemo(() => {
    return pickRandomFromArray(weaponTypes);
  }, []);

  const onCollected = (data: WeaponData) => {
    console.log("collected", data);
  };

  return (
    <ItemSpawner
      Item={Weapon.Component}
      {...props}
      onCollected={onCollected}
      data={Weapon.data}
    />
  );
};

export const weaponTypes = [
  {
    Component: Sword_Golden,
    data: { type: WeaponTypes.Sword, rarity: Rarity.Rare, damage: 10 },
  },
  {
    Component: Dagger,
    data: { type: WeaponTypes.Dagger, rarity: Rarity.Medium, damage: 5 },
  },
  {
    Component: Dagger_Golden,
    data: { type: WeaponTypes.Dagger, rarity: Rarity.Rare, damage: 10 },
  },
  {
    Component: Sword,
    data: { type: WeaponTypes.Sword, rarity: Rarity.Medium, damage: 10 },
  },
  {
    Component: Sword_big,
    data: { type: WeaponTypes.Sword_Big, rarity: Rarity.Medium, damage: 5 },
  },
  {
    Component: Sword_big_Golden,
    data: { type: WeaponTypes.Sword_Big, rarity: Rarity.Rare, damage: 10 },
  },
  {
    Component: Axe_Double,
    data: { type: WeaponTypes.Axe, rarity: Rarity.Medium, damage: 15 },
  },
  {
    Component: Axe_Double_Golden,
    data: { type: WeaponTypes.Axe, rarity: Rarity.Rare, damage: 20 },
  },
  {
    Component: Axe_small,
    data: { type: WeaponTypes.Axe, rarity: Rarity.Medium, damage: 10 },
  },
  {
    Component: Axe_small_Golden,
    data: { type: WeaponTypes.Axe, rarity: Rarity.Rare, damage: 15 },
  },
  {
    Component: Bow_Wooden,
    data: { type: WeaponTypes.Bow, rarity: Rarity.Medium, damage: 10 },
  },
  {
    Component: Bow_Golden,
    data: { type: WeaponTypes.Bow, rarity: Rarity.Rare, damage: 20 },
  },
];
