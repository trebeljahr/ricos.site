import {
  Potion1_Filled,
  Potion2_Filled,
  Potion3_Filled,
  Potion4_Filled,
  Potion5_Filled,
  Potion6_Filled,
  Potion7_Filled,
  Potion8_Filled,
  Potion9_Filled,
  Potion10_Filled,
  Potion11_Filled,
} from "@r3f/AllModels/rpg_items_pack";
import { useHealthContext } from "@r3f/Contexts/HealthbarContext";
import { useMemo } from "react";
import { pickRandomFromArray } from "src/lib/utils/randomFromArray";
import { useInventory } from "../InventorySystem/GameInventoryContext";
import { type Collectible, ItemSpawner, type SpawnerImplementation } from "./ItemSpawner";

type PotionData = {
  health: number;
};

const potionTypes = [
  { Component: Potion1_Filled, data: { health: 0.1 } },
  { Component: Potion2_Filled, data: { health: 0.1 } },
  { Component: Potion3_Filled, data: { health: 0.1 } },
  { Component: Potion4_Filled, data: { health: 0.1 } },
  { Component: Potion5_Filled, data: { health: 0.1 } },
  { Component: Potion6_Filled, data: { health: 0.1 } },
  { Component: Potion7_Filled, data: { health: 0.1 } },
  { Component: Potion8_Filled, data: { health: 0.1 } },
  { Component: Potion9_Filled, data: { health: 0.1 } },
  { Component: Potion10_Filled, data: { health: 0.1 } },
  { Component: Potion11_Filled, data: { health: 0.1 } },
];

export const RandomPotionSpawner: SpawnerImplementation = (props) => {
  const { addItem } = useInventory();

  const Potion: Collectible<PotionData> = useMemo(() => {
    return pickRandomFromArray(potionTypes);
  }, []);

  const { heal } = useHealthContext();

  const onCollected = (data: PotionData) => {
    heal(0.1);
    addItem({
      id: "potion",
      name: "Potion",
      type: "consumable",
      icon: "/icons/potion-blue.png",
      description: "A potion to heal you.",
      stackable: true,
      maxStack: 20,
      quantity: 1,
      value: 10,
      weight: 0.5,
    });
  };

  return (
    <ItemSpawner Item={Potion.Component} {...props} onCollected={onCollected} data={Potion.data} />
  );
};
