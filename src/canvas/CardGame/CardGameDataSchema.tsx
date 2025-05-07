// Data Types for Card Game

// Card Effect Types
export type CardEffect =
  | "DAMAGE_OPPONENT"
  | "HEAL_PLAYER"
  | "DRAW_CARD"
  | "BUFF_CARDS"
  | "DEBUFF_OPPONENT_CARDS"
  | "NONE";

// Card Data Structure
export interface CardData {
  id: string;
  name: string;
  imageUrl: string;
  attack: number; // Between 0-10
  defense: number; // Between 0-10
  sacrificeValue: number; // Between 0-5
  effect: CardEffect;
  effectValue?: number;
  effectDescription: string;
}

// Player Data Structure
export interface Player {
  id: string;
  name: string;
  deck: CardData[];
  hand: CardData[];
  lifeTotal: number;
  boardSlots: (CardData | null)[];
}

// Game Phase Type
export type GamePhase = "DRAW" | "PLAY" | "ATTACK" | "END";

// Game State Structure
export interface GameState {
  player: Player;
  enemy: Player;
  currentPhase: GamePhase;
  turn: number;
  gameOver: boolean;
  winner: string | null;
}

// JSON Deck Structure
export interface DeckJSON {
  name: string;
  author: string;
  description: string;
  cards: CardData[];
}

// Sample Deck JSON
export const sampleDeckJSON: DeckJSON = {
  name: "Beginner's Deck",
  author: "Game Developer",
  description:
    "A balanced deck for beginners with a mix of creatures and spells",
  cards: [
    {
      id: "1",
      name: "Fire Dragon",
      imageUrl: "/api/placeholder/250/350",
      attack: 8,
      defense: 6,
      sacrificeValue: 3,
      effect: "DAMAGE_OPPONENT",
      effectValue: 2,
      effectDescription: "Deal 2 damage to opponent when played",
    },
    {
      id: "2",
      name: "Shield Bearer",
      imageUrl: "/api/placeholder/250/350",
      attack: 2,
      defense: 9,
      sacrificeValue: 2,
      effect: "BUFF_CARDS",
      effectValue: 1,
      effectDescription: "Add +1 defense to all your other cards",
    },
    {
      id: "3",
      name: "Nimble Scout",
      imageUrl: "/api/placeholder/250/350",
      attack: 4,
      defense: 3,
      sacrificeValue: 1,
      effect: "DRAW_CARD",
      effectValue: 1,
      effectDescription: "Draw a card when played",
    },
    {
      id: "4",
      name: "Dark Mage",
      imageUrl: "/api/placeholder/250/350",
      attack: 6,
      defense: 4,
      sacrificeValue: 2,
      effect: "DEBUFF_OPPONENT_CARDS",
      effectValue: 1,
      effectDescription: "Reduce attack of all opponent cards by 1",
    },
    {
      id: "5",
      name: "Healer",
      imageUrl: "/api/placeholder/250/350",
      attack: 3,
      defense: 5,
      sacrificeValue: 2,
      effect: "HEAL_PLAYER",
      effectValue: 3,
      effectDescription: "Restore 3 life when played",
    },
    {
      id: "6",
      name: "Goblin",
      imageUrl: "/api/placeholder/250/350",
      attack: 3,
      defense: 2,
      sacrificeValue: 0,
      effect: "NONE",
      effectDescription: "No effect",
    },
    {
      id: "7",
      name: "Ogre",
      imageUrl: "/api/placeholder/250/350",
      attack: 5,
      defense: 5,
      sacrificeValue: 1,
      effect: "NONE",
      effectDescription: "No effect",
    },
    {
      id: "8",
      name: "War Chief",
      imageUrl: "/api/placeholder/250/350",
      attack: 7,
      defense: 7,
      sacrificeValue: 3,
      effect: "BUFF_CARDS",
      effectValue: 2,
      effectDescription: "Add +2 attack to all your other cards",
    },
    {
      id: "9",
      name: "Assassin",
      imageUrl: "/api/placeholder/250/350",
      attack: 9,
      defense: 2,
      sacrificeValue: 2,
      effect: "DAMAGE_OPPONENT",
      effectValue: 3,
      effectDescription: "Deal 3 damage to opponent when played",
    },
    {
      id: "10",
      name: "Ancient Guardian",
      imageUrl: "/api/placeholder/250/350",
      attack: 4,
      defense: 10,
      sacrificeValue: 4,
      effect: "HEAL_PLAYER",
      effectValue: 5,
      effectDescription: "Restore 5 life when played",
    },
    // Additional cards to make a full deck
    {
      id: "11",
      name: "Elemental Wizard",
      imageUrl: "/api/placeholder/250/350",
      attack: 6,
      defense: 4,
      sacrificeValue: 2,
      effect: "DAMAGE_OPPONENT",
      effectValue: 2,
      effectDescription: "Deal 2 damage to opponent when played",
    },
    {
      id: "12",
      name: "Forest Guardian",
      imageUrl: "/api/placeholder/250/350",
      attack: 5,
      defense: 7,
      sacrificeValue: 2,
      effect: "HEAL_PLAYER",
      effectValue: 2,
      effectDescription: "Restore 2 life when played",
    },
    {
      id: "13",
      name: "Wolf Pack",
      imageUrl: "/api/placeholder/250/350",
      attack: 6,
      defense: 4,
      sacrificeValue: 1,
      effect: "NONE",
      effectDescription: "No effect",
    },
    {
      id: "14",
      name: "Battle Mage",
      imageUrl: "/api/placeholder/250/350",
      attack: 7,
      defense: 5,
      sacrificeValue: 2,
      effect: "DAMAGE_OPPONENT",
      effectValue: 1,
      effectDescription: "Deal 1 damage to opponent when played",
    },
    {
      id: "15",
      name: "Elven Archer",
      imageUrl: "/api/placeholder/250/350",
      attack: 4,
      defense: 2,
      sacrificeValue: 1,
      effect: "NONE",
      effectDescription: "No effect",
    },
    {
      id: "16",
      name: "Dwarven Defender",
      imageUrl: "/api/placeholder/250/350",
      attack: 3,
      defense: 8,
      sacrificeValue: 2,
      effect: "NONE",
      effectDescription: "No effect",
    },
    {
      id: "17",
      name: "Griffin Rider",
      imageUrl: "/api/placeholder/250/350",
      attack: 6,
      defense: 5,
      sacrificeValue: 3,
      effect: "DRAW_CARD",
      effectValue: 1,
      effectDescription: "Draw a card when played",
    },
    {
      id: "18",
      name: "Mystic Sage",
      imageUrl: "/api/placeholder/250/350",
      attack: 2,
      defense: 7,
      sacrificeValue: 1,
      effect: "BUFF_CARDS",
      effectValue: 1,
      effectDescription: "Add +1 attack to all your other cards",
    },
    {
      id: "19",
      name: "Shadow Assassin",
      imageUrl: "/api/placeholder/250/350",
      attack: 7,
      defense: 3,
      sacrificeValue: 2,
      effect: "DEBUFF_OPPONENT_CARDS",
      effectValue: 1,
      effectDescription: "Reduce defense of all opponent cards by 1",
    },
    {
      id: "20",
      name: "Knight Commander",
      imageUrl: "/api/placeholder/250/350",
      attack: 6,
      defense: 6,
      sacrificeValue: 3,
      effect: "BUFF_CARDS",
      effectValue: 1,
      effectDescription: "Add +1 attack and +1 defense to all your other cards",
    },
  ],
};

// Function to create a new deck
export function createNewDeck(
  name: string,
  author: string,
  description: string,
  cards: CardData[]
): DeckJSON {
  return {
    name,
    author,
    description,
    cards,
  };
}

// Function to load a deck from JSON
export function loadDeckFromJSON(deckJSON: DeckJSON): CardData[] {
  return [...deckJSON.cards];
}

// Function to validate a card
export function validateCard(card: CardData): boolean {
  // Check attack and defense are between 0-10
  if (card.attack < 0 || card.attack > 10) return false;
  if (card.defense < 0 || card.defense > 10) return false;

  // Check sacrifice value is between 0-5
  if (card.sacrificeValue < 0 || card.sacrificeValue > 5) return false;

  // Check that effect is valid
  const validEffects: CardEffect[] = [
    "DAMAGE_OPPONENT",
    "HEAL_PLAYER",
    "DRAW_CARD",
    "BUFF_CARDS",
    "DEBUFF_OPPONENT_CARDS",
    "NONE",
  ];
  if (!validEffects.includes(card.effect)) return false;

  // Check that if effect is not NONE, effectValue exists
  if (card.effect !== "NONE" && typeof card.effectValue !== "number")
    return false;

  return true;
}

// Function to validate a deck
export function validateDeck(deck: DeckJSON): boolean {
  // Check if deck has required properties
  if (
    !deck.name ||
    !deck.author ||
    !deck.description ||
    !Array.isArray(deck.cards)
  )
    return false;

  // Check if deck has at least 20 cards
  if (deck.cards.length < 20) return false;

  // Check if all cards are valid
  return deck.cards.every(validateCard);
}
