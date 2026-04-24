import { In, ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import {
  InventoryProvider,
  type Item,
  useInventory,
} from "@r3f/Dungeon/InventorySystem/GameInventoryContext";
import { Inventory, InventoryToggleButton } from "@r3f/Dungeon/InventorySystem/GameInventoryUI";
import { type FC, useCallback, useEffect, useMemo } from "react";
import { type SeoInfo, getSeoInfo } from "src/lib/getSeoInfo";

// Example item generator
const createItem = (
  id: string,
  name: string,
  type: "weapon" | "armor" | "consumable" | "material" | "quest",
  icon: string,
  equipSlot?: "head" | "chest" | "legs" | "feet" | "left" | "right",
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

export default function Game({ seo }: { seo: SeoInfo | null }) {
  return (
    <InventoryProvider maxSlots={28} maxWeight={100}>
      <GameWorld seo={seo} />
      <Inventory />
      <InventoryToggleButton />
    </InventoryProvider>
  );
}

const defaultSeoInfo = {
  title: "Inventory Demo",
  description:
    "In this demo I set up an inventory system with React and a playground to add and remove as well as equip items.",
  url: "/r3f/user-interfaces/inventory",
  keywords: ["threejs", "react-three-fiber", "r3f", "3D", "programming", "graphics", "webgl"],
  image: "/assets/pages/inventory.png",
  imageAlt: "a inventory prototype for a simple game",
};

const GameWorld: FC<{ seo: SeoInfo | null }> = ({ seo }) => {
  const seoInfo = {
    ...defaultSeoInfo,
    ...(seo && {
      title: seo.metaTitle,
      description: seo.metaDescription,
      image: seo.ogImage,
      imageAlt: seo.ogImageAlt,
      keywords: seo.keywords,
    }),
  };
  const { addItem, canAddItem, isOpen } = useInventory();

  // Sample items that could be found in the game world
  const sampleItems = useMemo(
    () => [
      createItem("sword1", "Iron Sword", "weapon", "/icons/sword.png", "right"),
      createItem("shield1", "Wooden Shield", "weapon", "/icons/shield.png", "left"),
      createItem("helmet1", "Steel Helmet", "armor", "/icons/helmet.png", "head"),
      createItem("chestplate1", "Leather Armor", "armor", "/icons/chest.png", "chest"),
      createItem("leggings1", "Chain Leggings", "armor", "/icons/legs.png", "legs"),
      createItem("boots1", "Leather Boots", "armor", "/icons/boots.png", "feet"),
      createItem("potion1", "Health Potion", "consumable", "/icons/potion-red.png"),
      createItem("potion2", "Mana Potion", "consumable", "/icons/potion-blue.png"),
      createItem("material1", "Iron Ore", "material", "/icons/ore.png"),
      createItem("quest1", "Ancient Scroll", "quest", "/icons/scroll.png"),
    ],
    [],
  );

  const addManaPotion = (amount: number) => {
    const manaPotion = sampleItems.find((item) => item.id === "potion2") as Item;

    if (!manaPotion) {
      return;
    }

    const newItem = {
      ...manaPotion,
      id: `${manaPotion.id}-${Date.now()}`,
      quantity: amount,
    };

    addItem(newItem);
  };

  const findRandomItem = useCallback(() => {
    const randomItem = sampleItems[Math.floor(Math.random() * sampleItems.length)];

    const newItem = {
      ...randomItem,
      id: `${randomItem.id}-${Date.now()}`, // Ensure unique ID
      quantity: randomItem.stackable ? Math.floor(Math.random() * 5) + 1 : 1,
    };

    addItem(newItem);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sampleItems]);

  useEffect(() => {
    for (let i = 0; i < 5; i++) {
      findRandomItem();
    }
  }, [findRandomItem]);

  return (
    <ThreeFiberLayout seoInfo={seoInfo}>
      <In>
        <div className="min-h-screen bg-gray-800 text-white p-6">
          <div className="max-w-4xl mx-auto">
            {/* Game area - only visible when inventory is closed */}
            {!isOpen && (
              <div className="bg-gray-900 rounded-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <h3 className="text-lg font-medium mb-2">Random Items</h3>
                    <p className="text-sm text-gray-400 mb-3">Search the area for useful items</p>
                    <button
                      type="button"
                      onClick={findRandomItem}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md transition-colors"
                    >
                      Add Random Item
                    </button>
                  </div>

                  <div className="bg-gray-800 p-4 rounded-lg">
                    <h3 className="text-lg font-medium mb-2">Mana Potions</h3>
                    <p className="text-sm text-gray-400 mb-3">Pickup mana potions</p>
                    <button
                      type="button"
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
      </In>
    </ThreeFiberLayout>
  );
};

export function getStaticProps() {
  return { props: { seo: getSeoInfo("/r3f/user-interfaces/inventory") } };
}
