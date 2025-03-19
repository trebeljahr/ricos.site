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
  // Inventory state
  items: Item[];
  equippedItems: EquippedItems;
  isOpen: boolean;
  maxSlots: number;

  // Inventory actions
  openInventory: () => void;
  closeInventory: () => void;
  toggleInventory: () => void;
  addItem: (item: Item) => boolean;
  removeItem: (itemId: string) => boolean;
  updateItem: (updatedItem: Item) => boolean;
  getItems: () => Item[];
  getItem: (itemId: string) => Item | undefined;
  equipItem: (item: Item, slot: ArmorSlot | HandSlot) => boolean;
  unequipItem: (slot: ArmorSlot | HandSlot) => Item | null;
  moveItem: (sourceId: string, destinationId: string) => void;

  // Utility methods
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
  initialItems = [],
  maxSlots = 20,
  maxWeight = 100,
}) => {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [equippedItems, setEquippedItems] = useState<EquippedItems>({
    head: null,
    chest: null,
    legs: null,
    feet: null,
    leftHand: null,
    rightHand: null,
  });

  // Configure DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Inventory open/close methods
  const openInventory = useCallback(() => setIsOpen(true), []);
  const closeInventory = useCallback(() => setIsOpen(false), []);
  const toggleInventory = useCallback(() => setIsOpen((prev) => !prev), []);

  // Add item to inventory
  const addItem = useCallback(
    (newItem: Item): boolean => {
      // Check if inventory is full
      if (items.length >= maxSlots && !newItem.stackable) {
        return false;
      }

      setItems((prevItems) => {
        // Check if the item is stackable and exists in inventory
        if (newItem.stackable) {
          const existingItemIndex = prevItems.findIndex(
            (item) =>
              item.id === newItem.id ||
              (item.name === newItem.name && item.type === newItem.type)
          );

          if (existingItemIndex !== -1) {
            // Clone the array to avoid direct mutation
            const updatedItems = [...prevItems];
            const existingItem = { ...updatedItems[existingItemIndex] };

            // Check if stack has a max size
            if (
              existingItem.maxStack &&
              existingItem.quantity + newItem.quantity > existingItem.maxStack
            ) {
              // Calculate how many can be added to this stack
              const canAdd = existingItem.maxStack - existingItem.quantity;

              if (canAdd <= 0) {
                // Create a new stack if the current one is full
                return [...prevItems, newItem];
              }

              // Add what we can to existing stack
              existingItem.quantity += canAdd;
              updatedItems[existingItemIndex] = existingItem;

              // Create a new item with the remainder
              if (newItem.quantity - canAdd > 0) {
                const remainderItem = {
                  ...newItem,
                  quantity: newItem.quantity - canAdd,
                };
                return [...updatedItems, remainderItem];
              }

              return updatedItems;
            } else {
              // No max stack or within limits, just add the quantity
              existingItem.quantity += newItem.quantity;
              updatedItems[existingItemIndex] = existingItem;
              return updatedItems;
            }
          }
        }

        // Item is not stackable or doesn't exist in inventory yet
        return [...prevItems, newItem];
      });

      return true;
    },
    [items, maxSlots]
  );

  // Remove item from inventory
  const removeItem = useCallback((itemId: string): boolean => {
    let removed = false;

    setItems((prevItems) => {
      const itemIndex = prevItems.findIndex((item) => item.id === itemId);

      if (itemIndex === -1) {
        return prevItems;
      }

      const itemToRemove = prevItems[itemIndex];

      // If quantity > 1, reduce quantity instead of removing
      if (itemToRemove.stackable && itemToRemove.quantity > 1) {
        const updatedItems = [...prevItems];
        updatedItems[itemIndex] = {
          ...itemToRemove,
          quantity: itemToRemove.quantity - 1,
        };
        removed = true;
        return updatedItems;
      } else {
        // Remove the item completely
        removed = true;
        return prevItems.filter((item) => item.id !== itemId);
      }
    });

    return removed;
  }, []);

  // Update an existing item
  const updateItem = useCallback((updatedItem: Item): boolean => {
    let updated = false;

    setItems((prevItems) => {
      const itemIndex = prevItems.findIndex(
        (item) => item.id === updatedItem.id
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

  // Get all items
  const getItems = useCallback((): Item[] => {
    return items;
  }, [items]);

  // Get a specific item
  const getItem = useCallback(
    (itemId: string): Item | undefined => {
      return items.find((item) => item.id === itemId);
    },
    [items]
  );

  // Equip an item
  const equipItem = useCallback(
    (item: Item, slot: ArmorSlot | HandSlot): boolean => {
      if (!item.equipable || !item.equipSlot) {
        return false;
      }

      // Make sure the item can go in the requested slot
      if (item.equipSlot !== slot) {
        return false;
      }

      setEquippedItems((prev) => {
        const newEquippedItems = { ...prev };

        // Map the slot name to the object property
        const slotMapping: Record<string, keyof EquippedItems> = {
          head: "head",
          chest: "chest",
          legs: "legs",
          feet: "feet",
          left: "leftHand",
          right: "rightHand",
        };

        const targetSlot = slotMapping[slot];

        // If something is already equipped, unequip it first
        if (prev[targetSlot]) {
          // Add the previously equipped item back to inventory
          addItem(prev[targetSlot] as Item);
        }

        // Equip the new item
        newEquippedItems[targetSlot] = item;

        // Remove the equipped item from inventory
        removeItem(item.id);

        return newEquippedItems;
      });

      return true;
    },
    [addItem, removeItem]
  );

  // Unequip an item
  const unequipItem = useCallback(
    (slot: ArmorSlot | HandSlot): Item | null => {
      let unequippedItem: Item | null = null;

      setEquippedItems((prev) => {
        const newEquippedItems = { ...prev };

        // Map the slot name to the object property
        const slotMapping: Record<string, keyof EquippedItems> = {
          head: "head",
          chest: "chest",
          legs: "legs",
          feet: "feet",
          left: "leftHand",
          right: "rightHand",
        };

        const targetSlot = slotMapping[slot];

        // If the slot is empty, nothing to do
        if (!prev[targetSlot]) {
          return prev;
        }

        // Store the item before we remove it
        unequippedItem = prev[targetSlot];

        // Unequip the item
        newEquippedItems[targetSlot] = null;

        // Add the item back to inventory
        if (unequippedItem) {
          addItem(unequippedItem);
        }

        return newEquippedItems;
      });

      return unequippedItem;
    },
    [addItem]
  );

  // Handle moving items within the inventory (drag and drop)
  const moveItem = useCallback((sourceId: string, destinationId: string) => {
    // This is a simplified version - you'd need to expand this based on your specific requirements
    setItems((prevItems) => {
      const sourceIndex = prevItems.findIndex((item) => item.id === sourceId);
      const destinationIndex = prevItems.findIndex(
        (item) => item.id === destinationId
      );

      if (sourceIndex === -1 || destinationIndex === -1) {
        return prevItems;
      }

      const newItems = [...prevItems];
      const [movedItem] = newItems.splice(sourceIndex, 1);
      newItems.splice(destinationIndex, 0, movedItem);

      return newItems;
    });
  }, []);

  // DnD handler for drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        moveItem(active.id as string, over.id as string);
      }
    },
    [moveItem]
  );

  // Utility methods
  const inventoryIsFull = useCallback((): boolean => {
    return items.length >= maxSlots;
  }, [items, maxSlots]);

  const getTotalWeight = useCallback((): number => {
    return items.reduce(
      (total, item) => total + item.weight * item.quantity,
      0
    );
  }, [items]);

  const canAddItem = useCallback(
    (item: Item): boolean => {
      // Check if adding this item would exceed weight limit
      if (getTotalWeight() + item.weight > maxWeight) {
        return false;
      }

      // Check if inventory has space
      if (!item.stackable && inventoryIsFull()) {
        return false;
      }

      // If stackable, check if we can add to existing stack
      if (item.stackable) {
        const existingItem = items.find(
          (i) =>
            i.id === item.id || (i.name === item.name && i.type === item.type)
        );

        if (existingItem && existingItem.maxStack) {
          return existingItem.quantity < existingItem.maxStack;
        }
      }

      return true;
    },
    [getTotalWeight, inventoryIsFull, items, maxWeight]
  );

  // Combine all context values
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
