import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from "react";
import {
  DndContext,
  DragEndEvent,
  useSensor,
  useSensors,
  PointerSensor,
} from "@dnd-kit/core";

// Define types for our inventory system
export type ItemType = "weapon" | "armor" | "consumable" | "material" | "quest";
export type ArmorSlot = "head" | "chest" | "legs" | "feet";
export type HandSlot = "left" | "right";

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  icon: string;
  description: string;
  stackable: boolean;
  maxStack: number;
  quantity: number;
  value: number;
  weight: number;
  equipable?: boolean;
  equipSlot?: ArmorSlot | HandSlot;
}

interface EquippedItems {
  head: Item | null;
  chest: Item | null;
  legs: Item | null;
  feet: Item | null;
  leftHand: Item | null;
  rightHand: Item | null;
}

interface InventoryContextType {
  items: (Item | null)[];
  equippedItems: EquippedItems;
  isOpen: boolean;
  maxSlots: number;

  openInventory: () => void;
  closeInventory: () => void;
  toggleInventory: () => void;
  addItem: (item: Item) => { amountLeft: number; amountAdded: number };
  removeItem: (index: number) => boolean;
  updateItem: (updatedItem: Item) => boolean;
  getItems: () => (Item | null)[];
  getItem: (itemId: string) => Item | null;
  equipItem: (
    inventorySlot: number,
    equipmentSlot: ArmorSlot | HandSlot
  ) => boolean;
  unequipItem: (slot: ArmorSlot | HandSlot) => void;
  moveItem: (sourceIndex: number, destinationIndex: number) => void;

  inventoryIsFull: () => boolean;
  getTotalWeight: () => number;
  canAddItem: (item: Item) => boolean;
}

// Create the context with default values
const InventoryContext = createContext<InventoryContextType | undefined>(
  undefined
);

// Provider props
interface InventoryProviderProps {
  children: ReactNode;
  initialItems?: Item[];
  maxSlots?: number;
  maxWeight?: number;
}

export const InventoryProvider: React.FC<InventoryProviderProps> = ({
  children,
  maxSlots = 20,
  maxWeight = 100,
}) => {
  const [items, setItems] = useState<(Item | null)[]>(
    Array.from({ length: maxSlots }, () => null)
  );
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [equippedItems, setEquippedItems] = useState<EquippedItems>({
    head: null,
    chest: null,
    legs: null,
    feet: null,
    leftHand: null,
    rightHand: null,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const openInventory = useCallback(() => setIsOpen(true), []);
  const closeInventory = useCallback(() => setIsOpen(false), []);
  const toggleInventory = useCallback(() => setIsOpen((prev) => !prev), []);

  const addItem = (
    newItem: Item
  ): { amountLeft: number; amountAdded: number } => {
    let amountLeft = newItem.quantity;

    setItems((prevItems) => {
      if (newItem.stackable) {
        let stillToAdd = newItem.quantity;
        const newItems = prevItems.map((item) => {
          if (item === null) {
            if (stillToAdd > 0) {
              console.log(newItem.maxStack);

              const canAdd = Math.min(newItem.maxStack, stillToAdd);
              stillToAdd -= canAdd;
              return { ...newItem, quantity: canAdd };
            }

            return item;
          }

          if (item.name === newItem.name && item.type === newItem.type) {
            const canAdd = Math.min(stillToAdd, item.maxStack - item.quantity);

            if (canAdd <= 0) {
              return item;
            }

            if (stillToAdd <= 0) {
              return item;
            }

            stillToAdd -= canAdd;
            return {
              ...item,
              quantity: item.quantity + canAdd,
            };
          }

          return item;
        });

        amountLeft = stillToAdd;

        return newItems;
      }

      const freeIndex = prevItems.findIndex((item) => item === null);
      if (freeIndex === -1) {
        return prevItems;
      }

      const updatedItems = [...prevItems];
      updatedItems[freeIndex] = newItem;

      amountLeft = 0;

      return updatedItems;
    });

    return { amountLeft, amountAdded: newItem.quantity - amountLeft };
  };

  const removeItem = (itemIndex: number): boolean => {
    let removed = false;
    if (itemIndex === undefined) return false;

    setItems((prevItems) => {
      const itemToRemove = prevItems[itemIndex];

      if (itemToRemove?.stackable && itemToRemove.quantity > 1) {
        const updatedItems = [...prevItems];
        updatedItems[itemIndex] = {
          ...itemToRemove,
          quantity: itemToRemove.quantity - 1,
        };
        removed = true;
        return updatedItems;
      } else {
        removed = true;
        const newItems = [...prevItems];
        newItems[itemIndex] = null;
        return newItems;
      }
    });

    return removed;
  };

  const updateItem = (updatedItem: Item): boolean => {
    let updated = false;

    setItems((prevItems) => {
      const itemIndex = prevItems.findIndex(
        (item) => item?.id === updatedItem.id
      );

      if (itemIndex === -1) {
        return prevItems;
      }

      updated = true;
      const newItems = [...prevItems];
      newItems[itemIndex] = updatedItem;
      return newItems;
    });

    return updated;
  };

  const getItems = useCallback((): (Item | null)[] => {
    return items;
  }, [items]);

  const getItem = useCallback(
    (itemId: string): Item | null => {
      const found = items.find((item) => item?.id === itemId);
      if (found) {
        return found;
      }
      return null;
    },
    [items]
  );

  const equipItem = (fromSlot: number, slot: ArmorSlot | HandSlot): boolean => {
    const item = items[fromSlot];
    if (!item) {
      return false;
    }

    if (!item.equipable || !item.equipSlot) {
      return false;
    }

    if (item.equipSlot !== slot) {
      return false;
    }

    setEquippedItems((currentlyEquipped) => {
      const newEquippedItems = { ...currentlyEquipped };

      const slotMapping: Record<string, keyof EquippedItems> = {
        head: "head",
        chest: "chest",
        legs: "legs",
        feet: "feet",
        left: "leftHand",
        right: "rightHand",
      };

      const targetSlot = slotMapping[slot];
      const itemFromEquipped = currentlyEquipped[targetSlot];

      console.log(itemFromEquipped);

      if (itemFromEquipped) {
        setItems((prevItems) => {
          const newItems = [...prevItems];
          newItems[fromSlot] = itemFromEquipped;
          return newItems;
        });
      } else {
        removeItem(fromSlot);
      }

      newEquippedItems[targetSlot] = item;

      return newEquippedItems;
    });

    return true;
  };

  const unequipItem = (
    slot: ArmorSlot | HandSlot,
    indexToUnequipTo?: number
  ) => {
    const slotMapping: Record<string, keyof EquippedItems> = {
      head: "head",
      chest: "chest",
      legs: "legs",
      feet: "feet",
      left: "leftHand",
      right: "rightHand",
    };

    const mappedEquipmentSlot = slotMapping[slot];

    const itemInEquipmentSlot = equippedItems[mappedEquipmentSlot];
    const inventorySlot =
      indexToUnequipTo ?? items.findIndex((item) => item === null);
    const noItemInInventorySlot = items[inventorySlot] === null;
    const canMoveItem = itemInEquipmentSlot !== null && noItemInInventorySlot;

    console.log({
      canMoveItem,
      itemInEquipmentSlot,
      inventorySlot,
      equippedItems,
      items,
    });

    if (!canMoveItem) {
      return;
    }

    setItems((prevItems) => {
      const newItems = [...prevItems];
      newItems[inventorySlot] = itemInEquipmentSlot;
      return newItems;
    });

    setEquippedItems((prev) => {
      const newEquippedItems = { ...prev };
      newEquippedItems[mappedEquipmentSlot] = null;
      return newEquippedItems;
    });
  };

  const moveItem = (sourceIndex: number, destinationIndex: number) => {
    setItems((prevItems) => {
      if (sourceIndex === undefined || destinationIndex === undefined) {
        return prevItems;
      }
      console.log(sourceIndex, destinationIndex);

      const newItems = [...prevItems];

      const movingItem = newItems[sourceIndex];
      const destinationItem = newItems[destinationIndex];

      console.log(movingItem, destinationItem);

      if (!movingItem) {
        return prevItems;
      }

      newItems[sourceIndex] = destinationItem || null;
      newItems[destinationIndex] = movingItem;

      console.log(newItems);

      return newItems;
    });
  };

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      console.log(event);

      const { active, over } = event;
      if (!active || !over) {
        return;
      }

      if (over.data.current?.isEquipmentSlot) {
        console.log("drag to equipment");
        equipItem(active.data.current?.slotIndex, over.data.current?.slotType);
        return;
      }
      if (
        active.data.current?.isEquipmentSlot &&
        over.data.current?.slotIndex !== undefined
      ) {
        console.log(
          "drag from equipment",
          active.data.current?.item,
          over.data.current?.slotIndex
        );
        unequipItem(
          active.data.current?.slotType,
          over.data.current?.slotIndex
        );
        return;
      }

      moveItem(active.data.current?.slotIndex, over?.data.current?.slotIndex);
    },
    [moveItem]
  );

  const inventorySlotsFull = useCallback((): boolean => {
    const filledSlots = items.filter((item) => item !== null).length;
    return filledSlots >= maxSlots;
  }, [items, maxSlots]);

  const getTotalWeight = useCallback((): number => {
    return items.reduce((total, item) => {
      if (!item) return total;

      return total + item.weight * item.quantity;
    }, 0);
  }, [items]);

  const canAddItem = useCallback(
    (item: Item): boolean => {
      if (getTotalWeight() + item.weight > maxWeight) {
        return false;
      }

      if (!item.stackable && inventorySlotsFull()) {
        return false;
      }

      if (item.stackable) {
        const capacity = items.reduce((acc, curr) => {
          if (curr && curr.name === item.name) {
            return acc + item.maxStack - curr.quantity;
          }
          if (curr === null) {
            return acc + item.maxStack;
          }

          return acc;
        }, 0);

        if (capacity >= item.quantity) {
          return true;
        }

        return false;
      }

      return true;
    },
    [getTotalWeight, inventorySlotsFull, items, maxWeight]
  );

  const contextValue: InventoryContextType = {
    items,
    equippedItems,
    isOpen,
    maxSlots,
    openInventory,
    closeInventory,
    toggleInventory,
    addItem,
    removeItem,
    updateItem,
    getItems,
    getItem,
    equipItem,
    unequipItem,
    moveItem,
    inventoryIsFull: inventorySlotsFull,
    getTotalWeight,
    canAddItem,
  };

  return (
    <InventoryContext.Provider value={contextValue}>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        {children}
      </DndContext>
    </InventoryContext.Provider>
  );
};

// Custom hook to use the inventory context
export const useInventory = (): InventoryContextType => {
  const context = useContext(InventoryContext);

  if (context === undefined) {
    throw new Error("useInventory must be used within an InventoryProvider");
  }

  return context;
};
