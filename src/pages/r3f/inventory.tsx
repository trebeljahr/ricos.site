import React, { useEffect } from "react";
import {
  InventoryProvider,
  useInventory,
  Item,
} from "@r3f/Dungeon/InventorySystem/GameInventoryContext";
import {
  Inventory,
  InventoryToggleButton,
} from "@r3f/Dungeon/InventorySystem/GameInventoryUI";

// Example item generator
const createItem = (
  id: string,
  name: string,
  type: "weapon" | "armor" | "consumable" | "material" | "quest",
  icon: string,
  equipSlot?: "head" | "chest" | "legs" | "feet" | "left" | "right"
): Item => {
  return {
    id,
    name,
    type,
    icon,
    description: `A ${name} for your adventures.`,
    stackable: type === "consumable" || type === "material",
    maxStack: type === "consumable" || type === "material" ? 20 : 1,
    quantity: 1,
    value: Math.floor(Math.random() * 100) + 1,
    weight: Math.floor(Math.random() * 5) + 1,
    equipable: type === "weapon" || type === "armor",
    equipSlot: equipSlot,
  };
};

export default function Game() {
  return (
    <InventoryProvider maxSlots={28} maxWeight={100}>
      <GameWorld />
      <Inventory />
      <InventoryToggleButton />
    </InventoryProvider>
  );
}

// Game world component that interacts with inventory
const GameWorld: React.FC = () => {
  const { addItem, canAddItem, isOpen } = useInventory();

  // Sample items that could be found in the game world
  const sampleItems = [
    createItem("sword1", "Iron Sword", "weapon", "/icons/sword.png", "right"),
    createItem(
      "shield1",
      "Wooden Shield",
      "weapon",
      "/icons/shield.png",
      "left"
    ),
    createItem("helmet1", "Steel Helmet", "armor", "/icons/helmet.png", "head"),
    createItem(
      "chestplate1",
      "Leather Armor",
      "armor",
      "/icons/chest.png",
      "chest"
    ),
    createItem(
      "leggings1",
      "Chain Leggings",
      "armor",
      "/icons/legs.png",
      "legs"
    ),
    createItem("boots1", "Leather Boots", "armor", "/icons/boots.png", "feet"),
    createItem(
      "potion1",
      "Health Potion",
      "consumable",
      "/icons/potion-red.png"
    ),
    createItem(
      "potion2",
      "Mana Potion",
      "consumable",
      "/icons/potion-blue.png"
    ),
    createItem("material1", "Iron Ore", "material", "/icons/ore.png"),
    createItem("quest1", "Ancient Scroll", "quest", "/icons/scroll.png"),
  ];

  const addManaPotion = (amount: number) => {
    const manaPotion = sampleItems.find(
      (item) => item.id === "potion2"
    ) as Item;

    if (!manaPotion) {
      console.warn("Mana Potion not found in sample items!");
      return;
    }

    const newItem = {
      ...manaPotion,
      id: `${manaPotion.id}-${Date.now()}`,
      quantity: amount,
    };

    const { amountLeft, amountAdded } = addItem(newItem);

    console.log({ amountLeft });

    if (amountLeft === 0) {
      console.info(
        `You found: ${newItem.name} ${
          newItem.quantity > 1 ? `(x${newItem.quantity})` : ""
        }!`
      );
    } else {
      console.warn(`Couldn't add ${amountLeft} ${newItem.name} to inventory!`);
      amountAdded > 0 && console.warn(`But added ${amountAdded}.`);
    }
  };

  const findRandomItem = () => {
    const randomItem =
      sampleItems[Math.floor(Math.random() * sampleItems.length)];

    const newItem = {
      ...randomItem,
      id: `${randomItem.id}-${Date.now()}`, // Ensure unique ID
      quantity: randomItem.stackable ? Math.floor(Math.random() * 5) + 1 : 1,
    };

    const { amountLeft, amountAdded } = addItem(newItem);

    if (amountLeft === 0) {
      console.info(
        `You found: ${newItem.name} ${
          newItem.quantity > 1 ? `(x${newItem.quantity})` : ""
        }!`
      );
    } else {
      console.warn(`Couldn't add ${amountLeft} ${newItem.name} to inventory!`);
      amountAdded > 0 && console.warn(`But added ${amountAdded}.`);
    }
  };

  useEffect(() => {
    for (let i = 0; i < 5; i++) {
      findRandomItem();
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-800 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Game area - only visible when inventory is closed */}
        {!isOpen && (
          <div className="bg-gray-900 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">
              Current Location: Dark Forest
            </h2>
            <p className="mb-4">
              You venture through the dense forest, keeping an eye out for
              valuable items and dangerous creatures.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-medium mb-2">Explore</h3>
                <p className="text-sm text-gray-400 mb-3">
                  Search the area for useful items
                </p>
                <button
                  onClick={findRandomItem}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  Add Random Item
                </button>
              </div>

              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-medium mb-2">Combat</h3>
                <p className="text-sm text-gray-400 mb-3">
                  Enemies lurk in the shadows
                </p>
                <button
                  onClick={() => addManaPotion(50)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  Add 50 Mana Potions
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
