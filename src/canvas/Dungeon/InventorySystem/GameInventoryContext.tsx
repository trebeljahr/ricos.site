import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from "react";

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
  handleItemDrop: (event: any) => void;
  handleItemDoubleClick: (item: Item) => void;

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

  const getEquippedItemBySlot = (slot: ArmorSlot | HandSlot): Item | null => {
    const slotMapping: Record<string, keyof EquippedItems> = {
      head: "head",
      chest: "chest",
      legs: "legs",
      feet: "feet",
      left: "leftHand",
      right: "rightHand",
    };

    return equippedItems[slotMapping[slot]];
  };

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

  // Handle item movement within the inventory
  const moveItem = useCallback((sourceId: string, destinationId: string) => {
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

  // Handler for FormKit drag and drop
  const handleItemDrop = useCallback(
    (event: any) => {
      const { payload, from, to } = event;

      // Handle drops between regular inventory slots
      if (from.id.startsWith("slot-") && to.id.startsWith("slot-")) {
        const sourceItem = payload;
        const sourceId = sourceItem.id;
        const destinationId = to.id.replace("slot-", "");

        // Find if there's an item at the destination
        const destinationItemIndex = items.findIndex(
          (_, index) => `slot-${index}` === to.id
        );
        const destinationItem =
          destinationItemIndex !== -1 ? items[destinationItemIndex] : null;

        if (destinationItem) {
          // Swap items
          setItems((prevItems) => {
            const newItems = [...prevItems];
            const sourceIndex = newItems.findIndex(
              (item) => item.id === sourceId
            );

            if (sourceIndex !== -1) {
              // Swap positions
              [newItems[sourceIndex], newItems[destinationItemIndex]] = [
                newItems[destinationItemIndex],
                newItems[sourceIndex],
              ];
            }

            return newItems;
          });
        } else {
          // Just reorder (moving to an empty slot)
          setItems((prevItems) => {
            const newItems = [...prevItems];
            const sourceIndex = newItems.findIndex(
              (item) => item.id === sourceId
            );

            if (sourceIndex !== -1) {
              const [movedItem] = newItems.splice(sourceIndex, 1);
              // Insert at the destination index
              const destIndex = parseInt(destinationId);
              newItems.splice(
                Math.min(destIndex, newItems.length),
                0,
                movedItem
              );
            }

            return newItems;
          });
        }
      }

      // Handle drops from inventory to equipment slots
      else if (from.id.startsWith("slot-") && to.id.startsWith("equipment-")) {
        const item = payload;
        const equipmentSlot = to.id.replace("equipment-", "") as
          | ArmorSlot
          | HandSlot;

        // Check if item can be equipped in this slot
        if (item.equipable && item.equipSlot === equipmentSlot) {
          equipItem(item, equipmentSlot);
        }
      }

      // Handle drops from equipment slots to inventory
      else if (from.id.startsWith("equipment-") && to.id.startsWith("slot-")) {
        const equipmentSlot = from.id.replace("equipment-", "") as
          | ArmorSlot
          | HandSlot;
        unequipItem(equipmentSlot);
      }

      // Handle drops between equipment slots
      else if (
        from.id.startsWith("equipment-") &&
        to.id.startsWith("equipment-")
      ) {
        const sourceSlot = from.id.replace("equipment-", "") as
          | ArmorSlot
          | HandSlot;
        const destSlot = to.id.replace("equipment-", "") as
          | ArmorSlot
          | HandSlot;

        const sourceItem = getEquippedItemBySlot(sourceSlot);

        if (sourceItem && sourceItem.equipSlot === destSlot) {
          // Unequip from source slot
          const item = unequipItem(sourceSlot);
          // Equip to destination slot if possible
          if (item) {
            equipItem(item, destSlot);
          }
        }
      }
    },
    [items, equipItem, unequipItem]
  );

  // Handle double clicking on an item (for equipping or using)
  const handleItemDoubleClick = useCallback(
    (item: Item) => {
      // If the item is equipable, equip it
      if (item.equipable && item.equipSlot) {
        equipItem(item, item.equipSlot);
      }

      // For consumables, you could add usage logic here
      if (item.type === "consumable") {
        // Example: Remove one from the stack
        removeItem(item.id);

        // You could add effects here (heal player, etc)
        console.log(`Used ${item.name}`);
      }
    },
    [equipItem, removeItem]
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
    handleItemDrop,
    inventoryIsFull,
    getTotalWeight,
    canAddItem,
    handleItemDoubleClick,
  };

  return (
    <InventoryContext.Provider value={contextValue}>
      {children}
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
