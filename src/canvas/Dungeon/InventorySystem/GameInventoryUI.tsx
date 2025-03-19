import React from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
  useInventory,
  Item,
  ArmorSlot,
  HandSlot,
  InventoryProvider,
} from "./GameInventoryContext";

// InventorySlot component for regular inventory grid slots
interface InventorySlotProps {
  item?: Item;
  index: number;
}

export const InventorySlot: React.FC<InventorySlotProps> = ({
  item,
  index,
}) => {
  const { setNodeRef: setDroppableRef } = useDroppable({
    id: `slot-${index}`,
  });

  // If there's an item, make it draggable
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    transform,
  } = useDraggable({
    id: item?.id || `empty-${index}`,
    data: { item, slotIndex: index },
    disabled: !item,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 10,
      }
    : undefined;

  // Set both refs to the same element
  const setRef = (element: HTMLDivElement) => {
    setDroppableRef(element);
    if (item) setDraggableRef(element);
  };

  return (
    <div
      ref={setRef}
      className="w-16 h-16 bg-gray-800 border-2 border-gray-700 rounded-md flex items-center justify-center relative"
      {...(item ? { ...attributes, ...listeners, style } : {})}
    >
      {item ? (
        <div className="w-full h-full p-1 flex flex-col items-center">
          <div
            className="w-10 h-10 bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${item.icon})` }}
          />
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
  const { equippedItems, equipItem, unequipItem } = useInventory();

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

  const { setNodeRef } = useDroppable({
    id: `equipment-${type}`,
    data: { type, isEquipmentSlot: true },
  });

  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    transform,
  } = useDraggable({
    id: item?.id || `empty-equipment-${type}`,
    data: { item, slotType: type, isEquipmentSlot: true },
    disabled: !item,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 10,
      }
    : undefined;

  // Set both refs to the same element
  const setRef = (element: HTMLDivElement) => {
    setNodeRef(element);
    if (item) setDraggableRef(element);
  };

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
        ref={setRef}
        className="w-16 h-16 bg-gray-800 border-2 border-gray-600 rounded-md flex items-center justify-center relative"
        {...(item ? { ...attributes, ...listeners, style } : {})}
        onDoubleClick={handleDoubleClick}
      >
        {item ? (
          <div className="w-full h-full p-1 flex items-center justify-center">
            <div
              className="w-10 h-10 bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${item.icon})` }}
            />
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

// Character Equipment component
export const CharacterEquipment: React.FC = () => {
  return (
    <div className="flex flex-col items-center bg-gray-900 p-4 rounded-lg border border-gray-700">
      <h3 className="text-lg text-gray-200 mb-4">Equipment</h3>

      <div className="relative w-48 h-64">
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
  const { isOpen, closeInventory, items, maxSlots, getTotalWeight } =
    useInventory();

  if (!isOpen) return null;

  // Calculate empty slots to fill the grid
  const emptySlots = Math.max(0, maxSlots - items.length);
  const allSlots = [
    ...items.map((item, index) => ({ item, index })),
    ...Array(emptySlots)
      .fill(null)
      .map((_, i) => ({ index: items.length + i, item: undefined })),
  ];

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
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {allSlots.map(({ item, index }) => (
                <InventorySlot
                  key={item?.id || `empty-${index}`}
                  item={item}
                  index={index}
                />
              ))}
            </div>
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

// Example of how to use the inventory in your game
export const GameInventorySystem: React.FC = () => {
  return (
    <InventoryProvider maxSlots={24} maxWeight={100}>
      {/* Your game components here */}
      <div className="min-h-screen bg-gray-800 text-white p-4">
        <h1 className="text-2xl mb-4">Your Game</h1>

        {/* Game content */}
        <p>Press the inventory button to manage your items.</p>

        {/* Inventory UI components */}
        <Inventory />
        <InventoryToggleButton />
      </div>
    </InventoryProvider>
  );
};
