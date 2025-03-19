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
  maxStack?: number;
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
  addItem: (item: Item) => boolean;
  removeItem: (itemId: string) => boolean;
  updateItem: (updatedItem: Item) => boolean;
  getItems: () => (Item | null)[];
  getItem: (itemId: string) => Item | null;
  equipItem: (item: Item, slot: ArmorSlot | HandSlot) => boolean;
  unequipItem: (slot: ArmorSlot | HandSlot) => Item | null;
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

  const addItem = useCallback(
    (newItem: Item): boolean => {
      if (inventoryIsFull() && !newItem.stackable) {
        return false;
      }

      setItems((prevItems) => {
        if (newItem.stackable) {
          const existingItemIndex = prevItems.findIndex((item) => {
            if (!item) return false;

            return (
              item.id === newItem.id ||
              (item.name === newItem.name && item.type === newItem.type)
            );
          });

          if (existingItemIndex !== -1) {
            const updatedItems = [...prevItems];
            const updatedItem = updatedItems[existingItemIndex];
            if (!updatedItem) return [...prevItems, newItem];

            const existingItem = { ...updatedItem };
            if (
              existingItem.maxStack &&
              existingItem.quantity + newItem.quantity > existingItem.maxStack
            ) {
              const canAdd = existingItem.maxStack - existingItem.quantity;

              if (canAdd <= 0) {
                return [...prevItems, newItem];
              }

              existingItem.quantity += canAdd;
              updatedItems[existingItemIndex] = existingItem;

              if (newItem.quantity - canAdd > 0) {
                const remainderItem = {
                  ...newItem,
                  quantity: newItem.quantity - canAdd,
                };
                return [...updatedItems, remainderItem];
              }

              return updatedItems;
            } else {
              existingItem.quantity += newItem.quantity;
              updatedItems[existingItemIndex] = existingItem;
              return updatedItems;
            }
          }
        }

        const freeIndex = prevItems.findIndex((item) => item === null);
        if (freeIndex === -1) {
          return prevItems;
        }

        const updatedItems = [...prevItems];
        updatedItems[freeIndex] = newItem;

        return [...updatedItems];
      });

      return true;
    },
    [items, maxSlots]
  );

  const removeItem = useCallback((itemId: string): boolean => {
    let removed = false;

    setItems((prevItems) => {
      const itemIndex = prevItems.findIndex((item) => item?.id === itemId);

      if (itemIndex === -1) {
        return prevItems;
      }

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
        return prevItems.filter((item) => item?.id !== itemId);
      }
    });

    return removed;
  }, []);

  const updateItem = useCallback((updatedItem: Item): boolean => {
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
  }, []);

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

  const equipItem = useCallback(
    (item: Item, slot: ArmorSlot | HandSlot): boolean => {
      if (!item.equipable || !item.equipSlot) {
        return false;
      }

      if (item.equipSlot !== slot) {
        return false;
      }

      setEquippedItems((prev) => {
        const newEquippedItems = { ...prev };

        const slotMapping: Record<string, keyof EquippedItems> = {
          head: "head",
          chest: "chest",
          legs: "legs",
          feet: "feet",
          left: "leftHand",
          right: "rightHand",
        };

        const targetSlot = slotMapping[slot];

        if (prev[targetSlot]) {
          addItem(prev[targetSlot] as Item);
        }

        newEquippedItems[targetSlot] = item;

        removeItem(item.id);

        return newEquippedItems;
      });

      return true;
    },
    [addItem, removeItem]
  );

  const unequipItem = useCallback(
    (slot: ArmorSlot | HandSlot): Item | null => {
      let unequippedItem: Item | null = null;

      setEquippedItems((prev) => {
        const newEquippedItems = { ...prev };

        const slotMapping: Record<string, keyof EquippedItems> = {
          head: "head",
          chest: "chest",
          legs: "legs",
          feet: "feet",
          left: "leftHand",
          right: "rightHand",
        };

        const targetSlot = slotMapping[slot];

        if (!prev[targetSlot]) {
          return prev;
        }

        unequippedItem = prev[targetSlot];

        newEquippedItems[targetSlot] = null;

        if (unequippedItem) {
          addItem(unequippedItem);
        }

        return newEquippedItems;
      });

      return unequippedItem;
    },
    [addItem]
  );

  const moveItem = useCallback(
    (sourceIndex: number, destinationIndex: number) => {
      setItems((prevItems) => {
        console.log(sourceIndex, destinationIndex);
        if (sourceIndex === -1 || destinationIndex === -1) {
          return prevItems;
        }

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
    },
    []
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      console.log(event);

      const { active, over } = event;
      if (!active || !over) {
        return;
      }

      moveItem(active.data.current?.slotIndex, over?.data.current?.slotIndex);
    },
    [moveItem]
  );

  const inventoryIsFull = useCallback((): boolean => {
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

      if (!item.stackable && inventoryIsFull()) {
        return false;
      }

      if (item.stackable) {
        const existingItem = items.find(
          (i) =>
            i?.id === item.id || (i?.name === item.name && i.type === item.type)
        );

        if (existingItem && existingItem.maxStack) {
          return existingItem.quantity < existingItem.maxStack;
        }
      }

      return true;
    },
    [getTotalWeight, inventoryIsFull, items, maxWeight]
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
    inventoryIsFull,
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
