import { useRef, useMemo, FC } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
  useInventory,
  Item,
  ArmorSlot,
  HandSlot,
  InventoryProvider,
} from "./GameInventoryContext";
import { FaTrash } from "react-icons/fa";
import { useSubscribeToKeyPress } from "@hooks/useKeyboardInput";

interface InventorySlotProps {
  item?: Item;
  index: number;
}

export const InventorySlot: FC<InventorySlotProps> = ({ item, index }) => {
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `slot-${index}`,
    data: { item, slotIndex: index },
  });

  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    transform,
  } = useDraggable({
    id: `item-${index}`,
    data: { item, slotIndex: index },
    disabled: !item,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 20,
      }
    : undefined;

  return (
    <div
      className="w-16 h-16 bg-gray-800 border-2 border-gray-700 rounded-md flex items-center justify-center"
      ref={setDroppableRef}
    >
      {item ? (
        <div
          className="w-full h-full p-1 flex flex-col items-center relative"
          ref={setDraggableRef}
          {...(item ? { ...attributes, ...listeners, style } : {})}
        >
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
      ) : (
        <div className="w-full h-full p-1 flex flex-col items-center" />
      )}
    </div>
  );
};

interface EquipmentSlotProps {
  type: ArmorSlot | HandSlot;
  label: string;
}

export const EquipmentSlot: FC<EquipmentSlotProps> = ({ type, label }) => {
  const { equippedItems, unequipItem } = useInventory();

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

  const { setNodeRef: setDroppableRef } = useDroppable({
    id: `equipment-${type}`,
    data: { type, isEquipmentSlot: true, slotType: type },
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
        zIndex: 20,
      }
    : undefined;

  const handleDoubleClick = () => {
    if (item) {
      unequipItem(type);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-gray-300">{label}</span>
      <div
        className="w-16 h-16 bg-gray-800 border-2 border-gray-600 rounded-md flex items-center justify-center"
        onDoubleClick={handleDoubleClick}
        ref={setDroppableRef}
      >
        {item ? (
          <div
            className="w-full h-full p-1 flex items-center justify-center"
            ref={setDraggableRef}
            {...(item ? { ...attributes, ...listeners, style } : {})}
          >
            <div
              className="w-10 h-10 bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${item.icon})` }}
            />
          </div>
        ) : (
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

export const CharacterEquipment: FC = () => {
  return (
    <div className="w-fit flex flex-col items-center bg-gray-900 p-4 rounded-lg border border-gray-700">
      <div className="w-48 h-fit">
        <EquipmentSlot type="head" label="Head" />
        <div className="flex">
          <EquipmentSlot type="left" label="Left Hand" />
          <EquipmentSlot type="chest" label="Chest" />
          <EquipmentSlot type="right" label="Right Hand" />
        </div>
        <EquipmentSlot type="legs" label="Legs" />
        <EquipmentSlot type="feet" label="Feet" />
      </div>
    </div>
  );
};

export const Inventory: FC = () => {
  const { isOpen, closeInventory, items, openInventory, getTotalWeight } =
    useInventory();

  useSubscribeToKeyPress("e", () => {
    if (!isOpen) openInventory();
    else closeInventory();
  });

  useSubscribeToKeyPress("Escape", () => {
    if (isOpen) closeInventory();
  });

  const { setNodeRef: setDroppableRef } = useDroppable({
    id: "trashcan",
  });

  if (!isOpen) return null;

  return (
    <div className="not-prose fixed inset-0 bg-black flex items-center justify-center z-50 w-screen h-screen">
      <div className="bg-gray-900 rounded-lg shadow-2xl max-w-4xl w-full max-h-screen overflow-auto">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <p className="mt-0 font-bold text-white">Inventory</p>

          <div className="flex items-center">
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

        <div className="p-4 flex flex-col sm:flex-row gap-6 relative overflow-hidden">
          <CharacterEquipment />

          <div className="flex-1">
            <div className="w-fit grid grid-cols-4 md:grid-cols-7 gap-2">
              {items.map((item, i) => {
                return (
                  <InventorySlot
                    key={(item?.id || "empty") + "-" + i}
                    item={item === null ? undefined : item}
                    index={i}
                  />
                );
              })}
            </div>
          </div>

          <div
            className="w-16 h-16 bg-gray-800 border-2 border-gray-600 rounded-md flex items-center justify-center absolute bottom-2 right-2"
            ref={setDroppableRef}
          >
            <FaTrash />
          </div>
        </div>
      </div>
    </div>
  );
};

export const InventoryToggleButton: FC = () => {
  const { openInventory } = useInventory();

  return (
    <button
      onClick={openInventory}
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
