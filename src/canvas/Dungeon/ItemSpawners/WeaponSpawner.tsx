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
  Sword_Golden,
  Sword_big,
  Sword_big_Golden,
} from "@r3f/AllModels/rpg_items_pack";
import { nanoid } from "nanoid";
import { useCallback, useMemo } from "react";
import { pickRandomFromArray } from "src/lib/utils/randomFromArray";
import { useInventory } from "../InventorySystem/GameInventoryContext";
import { type Collectible, ItemSpawner, Rarity, type SpawnerImplementation } from "./ItemSpawner";

enum WeaponTypes {
  Sword = 0,
  Sword_Big = 1,
  Axe = 2,
  DoubleAxe = 3,
  Bow = 4,
  Dagger = 5,
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

  const { addItem } = useInventory();

  const onCollected = useCallback(
    (data: WeaponData) => {
      addItem({
        id: `weapon-${data.type}-${nanoid()}`,
        name: Weapon.Component.name,
        type: "weapon",
        icon: "/icons/sword.png",
        description: `A ${Weapon.Component.name} for your adventures.`,
        stackable: false,
        maxStack: 1,
        quantity: 1,
        value: Math.floor(Math.random() * 100) + 1,
        weight: Math.floor(Math.random() * 5) + 1,
        equipable: true,
        equipSlot: "right",
      });
    },
    [addItem, Weapon],
  );

  return (
    <ItemSpawner Item={Weapon.Component} {...props} onCollected={onCollected} data={Weapon.data} />
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
