import React, { useEffect } from "react";
import {
  useInventory,
  Item,
  ArmorSlot,
  HandSlot,
} from "./GameInventoryContext";
import { useDragAndDrop } from "@formkit/drag-and-drop/react";

// Icon map for placeholder icons when actual icon paths aren't available
const iconMap: Record<string, JSX.Element> = {
  // Weapons
  sword: (
    <svg viewBox="0 0 24 24" className="w-full h-full text-gray-200">
      <path
        fill="currentColor"
        d="M6.92,5H5L14,14L15,13.06M19.96,19.12L19.12,19.96C18.73,20.35 18.1,20.35 17.71,19.96L14.05,16.3L12,14.06L8.12,10.18L5.28,7.34L4.4,6.46L2.29,4.35L4.35,2.29L6.46,4.4L7.34,5.28L10.18,8.12L14.06,12L16.3,14.05L19.96,17.71C20.35,18.1 20.35,18.73 19.96,19.12M18.5,2A4.5,4.5 0 0,1 23,6.5C23,9.87 18.5,15.86 18.5,15.86C18.5,15.86 14,9.87 14,6.5A4.5,4.5 0 0,1 18.5,2M18.5,5A1.5,1.5 0 0,0 17,6.5A1.5,1.5 0 0,0 18.5,8A1.5,1.5 0 0,0 20,6.5A1.5,1.5 0 0,0 18.5,5Z"
      />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" className="w-full h-full text-gray-200">
      <path
        fill="currentColor"
        d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1Z"
      />
    </svg>
  ),
  // Armor
  helmet: (
    <svg viewBox="0 0 24 24" className="w-full h-full text-gray-200">
      <path
        fill="currentColor"
        d="M12,1C6.5,1 2,5.5 2,11V20H5V23H19V20H22V11C22,5.5 17.5,1 12,1M12,3C16.4,3 20,6.6 20,11V18H4V11C4,6.6 7.6,3 12,3Z"
      />
    </svg>
  ),
  chest: (
    <svg viewBox="0 0 24 24" className="w-full h-full text-gray-200">
      <path
        fill="currentColor"
        d="M16,21H8A1,1 0 0,1 7,20V12.07L5.7,13.12C5.31,13.5 4.68,13.5 4.29,13.12L1.46,10.29C1.07,9.9 1.07,9.27 1.46,8.88L7.34,3H9C9,4.1 10.34,5 12,5C13.66,5 15,4.1 15,3H16.66L22.54,8.88C22.93,9.27 22.93,9.9 22.54,10.29L19.71,13.12C19.32,13.5 18.69,13.5 18.3,13.12L17,12.07V20A1,1 0 0,1 16,21M20.42,9.58L16.11,5.28C15.8,5.63 15.43,5.94 15,6.2C14.16,6.7 13.13,7 12,7C10.3,7 8.79,6.32 7.89,5.28L3.58,9.58L5,11L8,9H9V19H15V9H16L19,11L20.42,9.58Z"
      />
    </svg>
  ),
  legs: (
    <svg viewBox="0 0 24 24" className="w-full h-full text-gray-200">
      <path
        fill="currentColor"
        d="M12,4A4,4 0 0,1 16,8H20V10H16.42C16.78,10.63 17,11.29 17,12C17,13.5 16,15 14.5,15.5V20H12.5V15.5C11,15 10,13.5 10,12C10,11.29 10.22,10.63 10.58,10H7V8H11A4,4 0 0,1 12,4M12,6A2,2 0 0,0 10,8A2,2 0 0,0 12,10A2,2 0 0,0 14,8A2,2 0 0,0 12,6Z"
      />
    </svg>
  ),
  boots: (
    <svg viewBox="0 0 24 24" className="w-full h-full text-gray-200">
      <path
        fill="currentColor"
        d="M3,15H13V17H3V15M16,15H21V17H16V15M3,19H6V21H3V19M7,19H10V21H7V19M11,19H14V21H11V19M15,19H18V21H15V19M19,19H22V21H19V19Z"
      />
    </svg>
  ),
  // Consumables
  "potion-red": (
    <svg viewBox="0 0 24 24" className="w-full h-full text-red-500">
      <path
        fill="currentColor"
        d="M5,2H19V4H5V2M12,5A1,1 0 0,1 13,6A1,1 0 0,1 12,7A1,1 0 0,1 11,6A1,1 0 0,1 12,5M13,8V22H11V8H13Z"
      />
    </svg>
  ),
  "potion-blue": (
    <svg viewBox="0 0 24 24" className="w-full h-full text-blue-500">
      <path
        fill="currentColor"
        d="M5,2H19V4H5V2M12,5A1,1 0 0,1 13,6A1,1 0 0,1 12,7A1,1 0 0,1 11,6A1,1 0 0,1 12,5M13,8V22H11V8H13Z"
      />
    </svg>
  ),
  // Materials
  ore: (
    <svg viewBox="0 0 24 24" className="w-full h-full text-gray-400">
      <path
        fill="currentColor"
        d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z"
      />
    </svg>
  ),
  // Quest
  scroll: (
    <svg viewBox="0 0 24 24" className="w-full h-full text-amber-200">
      <path
        fill="currentColor"
        d="M17,21L12,17L7,21V3H17M19,1H5A2,2 0 0,0 3,3V23L12,18L21,23V3A2,2 0 0,0 19,1Z"
      />
    </svg>
  ),
  // Generic/default
  default: (
    <svg viewBox="0 0 24 24" className="w-full h-full text-gray-300">
      <path
        fill="currentColor"
        d="M21,16.5C21,16.88 20.79,17.21 20.47,17.38L12.57,21.82C12.41,21.94 12.21,22 12,22C11.79,22 11.59,21.94 11.43,21.82L3.53,17.38C3.21,17.21 3,16.88 3,16.5V7.5C3,7.12 3.21,6.79 3.53,6.62L11.43,2.18C11.59,2.06 11.79,2 12,2C12.21,2 12.41,2.06 12.57,2.18L20.47,6.62C20.79,6.79 21,7.12 21,7.5M12,4.15L5,8.09V15.91L12,19.85L19,15.91V8.09"
      />
    </svg>
  ),
};

/**
 * Get an icon component based on the icon path or type
 */
export const getIconComponent = (
  iconPath: string,
  type: string = "default"
): JSX.Element => {
  // If path is a full URL or starts with /, assume it's a real image
  if (iconPath && (iconPath.startsWith("http") || iconPath.startsWith("/"))) {
    return (
      <div
        className="w-full h-full bg-contain bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${iconPath})` }}
      />
    );
  }

  // Otherwise, use the icon map based on the icon name or type
  const iconName = iconPath.split("/").pop()?.replace(".png", "") || type;
  return iconMap[iconName] || iconMap[type] || iconMap.default;
};

/**
 * Helper function to get a placeholder item icon div with the SVG icon
 */
export const ItemIcon: React.FC<{
  iconPath: string;
  type: string;
  className?: string;
}> = ({ iconPath, type, className = "w-10 h-10" }) => {
  return <div className={className}>{getIconComponent(iconPath, type)}</div>;
};

// Main Inventory Grid Component
export const InventoryGrid: React.FC = () => {
  const { items, maxSlots, addItem, removeItem, moveItem } = useInventory();

  // Create a list with empty slots to fill the grid
  const fullItemsList: (Item | undefined)[] = [...items];
  const emptySlotCount = Math.max(0, maxSlots - items.length);

  for (let i = 0; i < emptySlotCount; i++) {
    fullItemsList.push(undefined);
  }

  // Set up drag and drop for the inventory grid
  const [gridRef, sortedItems, setSortedItems] = useDragAndDrop<
    HTMLDivElement,
    Item | undefined
  >(fullItemsList, {
    draggable: (el) => {
      return true;
    },
  });

  // Update sorted items when inventory changes
  useEffect(() => {
    setSortedItems([...items, ...Array(emptySlotCount).fill(null)]);
  }, [items, emptySlotCount, setSortedItems]);

  return (
    <div
      ref={gridRef}
      className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2"
    >
      {sortedItems.map((item, index) => (
        <InventorySlot
          key={item?.id || `empty-${index}`}
          item={item}
          index={index}
        />
      ))}
    </div>
  );
};

// InventorySlot component for regular inventory grid slots
interface InventorySlotProps {
  item: Item | undefined;
  index: number;
}

export const InventorySlot: React.FC<InventorySlotProps> = ({
  item,
  index,
}) => {
  const { handleItemDoubleClick } = useInventory();

  const handleDoubleClick = () => {
    if (item) {
      handleItemDoubleClick(item);
    }
  };

  return (
    <div
      className={`w-16 h-16 bg-gray-800 border-2 ${
        item ? "border-gray-700" : "border-gray-900"
      } rounded-md flex items-center justify-center relative ${
        !item ? "empty-slot" : ""
      }`}
      onDoubleClick={handleDoubleClick}
      data-index={index}
      data-id={item?.id}
    >
      {item ? (
        <div className="w-full h-full p-1 flex flex-col items-center">
          <div className="relative">
            <ItemIcon iconPath={item.icon} type={item.type} />
          </div>
          {item.stackable && item.quantity > 1 && (
            <span className="text-white text-xs absolute bottom-1 right-1">
              {item.quantity}
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
};

// EquipmentSlot component for character equipment
interface EquipmentSlotProps {
  type: ArmorSlot | HandSlot;
  label: string;
}

export const EquipmentSlot: React.FC<EquipmentSlotProps> = ({
  type,
  label,
}) => {
  const { equippedItems, unequipItem } = useInventory();

  // Map slot type to the equipped item
  const getEquippedItem = () => {
    switch (type) {
      case "head":
        return equippedItems.head;
      case "chest":
        return equippedItems.chest;
      case "legs":
        return equippedItems.legs;
      case "feet":
        return equippedItems.feet;
      case "left":
        return equippedItems.leftHand;
      case "right":
        return equippedItems.rightHand;
      default:
        return null;
    }
  };

  const item = getEquippedItem();

  // Handle double click to unequip
  const handleDoubleClick = () => {
    if (item) {
      unequipItem(type);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-gray-300">{label}</span>
      <div
        className={`w-16 h-16 bg-gray-800 border-2 border-gray-600 rounded-md flex items-center justify-center relative`}
        onDoubleClick={handleDoubleClick}
        data-equipslot={type}
        data-equipment-id={item?.id}
      >
        {item ? (
          <div className="w-full h-full p-1 flex items-center justify-center">
            <ItemIcon iconPath={item.icon} type={item.type} />
          </div>
        ) : (
          // Show a faded silhouette based on the slot type
          <div className="w-8 h-8 opacity-20">
            {type === "head" && (
              <div className="w-full h-full bg-gray-400 rounded-full" />
            )}
            {type === "chest" && (
              <div className="w-full h-full bg-gray-400 rounded-md" />
            )}
            {type === "legs" && (
              <div className="w-full h-full bg-gray-400 rounded-b-md" />
            )}
            {type === "feet" && (
              <div className="w-full h-full bg-gray-400 rounded-md" />
            )}
            {(type === "left" || type === "right") && (
              <div className="w-full h-full bg-gray-400 transform -rotate-45" />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Character Equipment component - uses drag and drop between equipment slots
export const CharacterEquipment: React.FC = () => {
  const { equippedItems } = useInventory();

  // Convert equipped items object to an array for drag and drop
  const equipmentArray = [
    { slot: "head", item: equippedItems.head },
    { slot: "chest", item: equippedItems.chest },
    { slot: "legs", item: equippedItems.legs },
    { slot: "feet", item: equippedItems.feet },
    { slot: "left", item: equippedItems.leftHand },
    { slot: "right", item: equippedItems.rightHand },
  ];

  // Set up drag and drop for equipment slots
  const [equipmentRef, sortedEquipment] = useDragAndDrop<HTMLDivElement>(
    equipmentArray,
    {
      draggable: (el) => !!el.getAttribute("data-equipment-id"),
      sortable: false,
    }
  );

  console.log(sortedEquipment);

  return (
    <div className="flex flex-col items-center bg-gray-900 p-4 rounded-lg border border-gray-700">
      <h3 className="text-lg text-gray-200 mb-4">Equipment</h3>

      <div ref={equipmentRef} className="relative w-48 h-64">
        {/* Character silhouette */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10">
          <svg viewBox="0 0 24 24" className="w-32 h-48 text-gray-400">
            <path
              fill="currentColor"
              d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"
            />
          </svg>
        </div>

        {/* Head slot */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2">
          <EquipmentSlot type="head" label="Head" />
        </div>

        {/* Chest slot */}
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2">
          <EquipmentSlot type="chest" label="Chest" />
        </div>

        {/* Legs slot */}
        <div className="absolute top-36 left-1/2 transform -translate-x-1/2">
          <EquipmentSlot type="legs" label="Legs" />
        </div>

        {/* Feet slot */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2">
          <EquipmentSlot type="feet" label="Feet" />
        </div>

        {/* Left hand slot */}
        <div className="absolute top-24 left-0">
          <EquipmentSlot type="left" label="Left Hand" />
        </div>

        {/* Right hand slot */}
        <div className="absolute top-24 right-0">
          <EquipmentSlot type="right" label="Right Hand" />
        </div>
      </div>
    </div>
  );
};

// Main Inventory component
export const Inventory: React.FC = () => {
  const { isOpen, closeInventory, getTotalWeight } = useInventory();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg shadow-2xl max-w-4xl w-full max-h-screen overflow-auto">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl text-gray-200">Inventory</h2>
          <div className="flex gap-4 items-center">
            <div className="text-gray-300 text-sm">
              Weight: {getTotalWeight().toFixed(1)} / 100
            </div>
            <button
              onClick={closeInventory}
              className="text-gray-400 hover:text-white"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6">
                <path
                  fill="currentColor"
                  d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-4 flex flex-col md:flex-row gap-6">
          {/* Character equipment section */}
          <CharacterEquipment />

          {/* Inventory grid */}
          <div className="flex-1">
            <h3 className="text-lg text-gray-200 mb-4">Items</h3>
            <InventoryGrid />
          </div>
        </div>
      </div>
    </div>
  );
};

// InventoryToggleButton component
export const InventoryToggleButton: React.FC = () => {
  const { toggleInventory } = useInventory();

  return (
    <button
      onClick={toggleInventory}
      className="fixed bottom-4 right-4 bg-gray-800 text-white p-2 rounded-full shadow-lg hover:bg-gray-700 transition-colors"
    >
      <svg viewBox="0 0 24 24" className="w-6 h-6">
        <path
          fill="currentColor"
          d="M19,4H5C3.89,4 3,4.9 3,6V18A2,2 0 0,0 5,20H19A2,2 0 0,0 21,18V6A2,2 0 0,0 19,4M19,18H5V8H19V18Z"
        />
      </svg>
    </button>
  );
};
