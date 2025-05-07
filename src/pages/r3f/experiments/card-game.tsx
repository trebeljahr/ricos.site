import {
  Image as DreiImage,
  OrbitControls,
  Text,
  useCursor,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { noop } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Group } from "three";

type CardEffect =
  | "DAMAGE_OPPONENT"
  | "HEAL_PLAYER"
  | "DRAW_CARD"
  | "BUFF_CARDS"
  | "DEBUFF_OPPONENT_CARDS"
  | "NONE";

interface CardData {
  id: string;
  name: string;
  imageUrl: string;
  attack: number;
  defense: number;
  sacrificeValue: number;
  effect: CardEffect;
  effectValue?: number;
  effectDescription: string;
}

interface Player {
  id: string;
  name: string;
  deck: CardData[];
  hand: CardData[];
  lifeTotal: number;
  boardSlots: (CardData | null)[];
}

type GamePhase = "DRAW" | "PLAY" | "ATTACK" | "END";

const initialDeck: CardData[] = [
  {
    id: "1",
    name: "Dragon",
    imageUrl: "/card-game/dragon.png",
    attack: 8,
    defense: 6,
    sacrificeValue: 3,
    effect: "DAMAGE_OPPONENT",
    effectValue: 2,
    effectDescription: "Deal 2 damage to opponent when played",
  },
  {
    id: "2",
    name: "Bear",
    imageUrl: "/card-game/bear.png",
    attack: 2,
    defense: 9,
    sacrificeValue: 0,
    effect: "BUFF_CARDS",
    effectValue: 1,
    effectDescription: "Add +1 defense to all your other cards",
  },
  {
    id: "3",
    name: "Bird",
    imageUrl: "/card-game/bird.png",
    attack: 4,
    defense: 3,
    sacrificeValue: 1,
    effect: "DRAW_CARD",
    effectValue: 1,
    effectDescription: "Draw a card when played",
  },
  {
    id: "4",
    name: "Elephant",
    imageUrl: "/card-game/elephant.png",
    attack: 6,
    defense: 4,
    sacrificeValue: 0,
    effect: "DEBUFF_OPPONENT_CARDS",
    effectValue: 1,
    effectDescription: "Reduce attack of all opponent cards by 1",
  },
  {
    id: "5",
    name: "Fish",
    imageUrl: "/card-game/Fish.png",
    attack: 3,
    defense: 5,
    sacrificeValue: 0,
    effect: "HEAL_PLAYER",
    effectValue: 3,
    effectDescription: "Restore 3 life when played",
  },
  {
    id: "6",
    name: "Frog",
    imageUrl: "/card-game/frog.png",
    attack: 3,
    defense: 2,
    sacrificeValue: 0,
    effect: "NONE",
    effectDescription: "No effect",
  },
  {
    id: "7",
    name: "Giraffe",
    imageUrl: "/card-game/giraffe.png",
    attack: 5,
    defense: 5,
    sacrificeValue: 1,
    effect: "NONE",
    effectDescription: "No effect",
  },
  {
    id: "8",
    name: "Knight",
    imageUrl: "/card-game/knight.png",
    attack: 7,
    defense: 7,
    sacrificeValue: 3,
    effect: "BUFF_CARDS",
    effectValue: 2,
    effectDescription: "Add +2 attack to all your other cards",
  },
  {
    id: "9",
    name: "Ork",
    imageUrl: "/card-game/ork.png",
    attack: 9,
    defense: 2,
    sacrificeValue: 2,
    effect: "DAMAGE_OPPONENT",
    effectValue: 3,
    effectDescription: "Deal 3 damage to opponent when played",
  },
  {
    id: "10",
    name: "Robot",
    imageUrl: "/card-game/robot.png",
    attack: 4,
    defense: 10,
    sacrificeValue: 4,
    effect: "HEAL_PLAYER",
    effectValue: 5,
    effectDescription: "Restore 5 life when played",
  },
  {
    id: "11",
    name: "Rock",
    imageUrl: "/card-game/rock.png",
    attack: 6,
    defense: 4,
    sacrificeValue: 2,
    effect: "DAMAGE_OPPONENT",
    effectValue: 2,
    effectDescription: "Deal 2 damage to opponent when played",
  },
  {
    id: "12",
    name: "Shark",
    imageUrl: "/card-game/shark.png",
    attack: 5,
    defense: 7,
    sacrificeValue: 2,
    effect: "HEAL_PLAYER",
    effectValue: 2,
    effectDescription: "Restore 2 life when played",
  },
  {
    id: "13",
    name: "Spider",
    imageUrl: "/card-game/spider.png",
    attack: 6,
    defense: 4,
    sacrificeValue: 1,
    effect: "NONE",
    effectDescription: "No effect",
  },
  {
    id: "14",
    name: "Stego",
    imageUrl: "/card-game/stego.png",
    attack: 7,
    defense: 5,
    sacrificeValue: 2,
    effect: "DAMAGE_OPPONENT",
    effectValue: 1,
    effectDescription: "Deal 1 damage to opponent when played",
  },
  {
    id: "15",
    name: "T-Rex",
    imageUrl: "/card-game/t-rex.png",
    attack: 4,
    defense: 2,
    sacrificeValue: 1,
    effect: "NONE",
    effectDescription: "No effect",
  },
  {
    id: "16",
    name: "Tiger",
    imageUrl: "/card-game/tiger.png",
    attack: 3,
    defense: 8,
    sacrificeValue: 2,
    effect: "NONE",
    effectDescription: "No effect",
  },
  {
    id: "17",
    name: "Tree Stump",
    imageUrl: "/card-game/tree-stump.png",
    attack: 6,
    defense: 5,
    sacrificeValue: 3,
    effect: "DRAW_CARD",
    effectValue: 1,
    effectDescription: "Draw a card when played",
  },
  {
    id: "18",
    name: "Tree",
    imageUrl: "/card-game/tree.png",
    attack: 2,
    defense: 7,
    sacrificeValue: 1,
    effect: "BUFF_CARDS",
    effectValue: 1,
    effectDescription: "Add +1 attack to all your other cards",
  },
  {
    id: "19",
    name: "Triceratops",
    imageUrl: "/card-game/triceratops.png",
    attack: 7,
    defense: 3,
    sacrificeValue: 0,
    effect: "DEBUFF_OPPONENT_CARDS",
    effectValue: 1,
    effectDescription: "Reduce defense of all opponent cards by 1",
  },
  {
    id: "20",
    name: "Wizard",
    imageUrl: "/card-game/wizard.png",
    attack: 6,
    defense: 6,
    sacrificeValue: 3,
    effect: "BUFF_CARDS",
    effectValue: 1,
    effectDescription: "Add +1 attack and +1 defense to all your other cards",
  },
];

function shuffle<T>(array: T[]): T[] {
  return array.sort(() => Math.random() - 0.5);
}

const Card = ({
  card,
  position,
  rotation = [0, 0, 0],
  scale = 2,
  isHovered = false,
  onClick,
}: {
  card: CardData;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  isHovered?: boolean;
  onClick?: () => void;
}) => {
  const groupRef = useRef<Group>(null!);
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);

  useCursor(hovered || isHovered);

  useFrame(() => {
    if (groupRef.current) {
      if (hovered || isHovered) {
        groupRef.current.scale.set(scale * 1.1, scale * 1.1, scale * 1.1);
      } else {
        groupRef.current.scale.set(scale, scale, scale);
      }
    }
  });

  return (
    <group
      position={position}
      rotation={rotation}
      ref={groupRef}
      onClick={onClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
      }}
    >
      {/* Card Background */}
      <mesh>
        <planeGeometry args={[1, 1.4]} />
        <meshStandardMaterial color={active ? "#5d8aa8" : "#8a8a8a"} />
      </mesh>

      {/* Card Content */}
      <group position={[0, 0.2, 0.01]}>
        <DreiImage url={card.imageUrl} transparent position={[0, 0, 0.01]} />
      </group>

      {/* Card Name */}
      <Text
        position={[0, 0.6, 0.02]}
        fontSize={0.07}
        color="black"
        anchorX="center"
        anchorY="middle"
      >
        {card.name}
      </Text>

      {/* Card Stats */}
      <group position={[0, -0.5, 0.02]}>
        <Text
          position={[-0.4, 0, 0]}
          fontSize={0.08}
          color="red"
          anchorX="center"
          anchorY="middle"
        >
          {`A: ${card.attack}`}
        </Text>
        <Text
          position={[0, 0, 0]}
          fontSize={0.08}
          color="blue"
          anchorX="center"
          anchorY="middle"
        >
          {`D: ${card.defense}`}
        </Text>
        <Text
          position={[0.4, 0, 0]}
          fontSize={0.08}
          color="purple"
          anchorX="center"
          anchorY="middle"
        >
          {`S: ${card.sacrificeValue}`}
        </Text>
      </group>

      {/* Effect Text */}
      <Text
        position={[0, -0.65, 0.02]}
        fontSize={0.05}
        color="black"
        anchorX="center"
        anchorY="middle"
        maxWidth={0.9}
      >
        {card.effect !== "NONE" ? card.effectDescription : ""}
      </Text>
    </group>
  );
};

const Board = ({
  playerData,
  enemyData,
  selectedCard,
  onCardSelect,
  onPlaceCard,
}: {
  playerData: Player;
  enemyData: Player;
  selectedCard: CardData | null;
  onCardSelect: (
    card: CardData,
    source: "hand" | "board",
    index: number
  ) => void;
  onPlaceCard: (index: number) => void;
}) => {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 0, 5);
  }, [camera]);

  return (
    <group>
      {/* Board background */}
      <mesh position={[0, 0, -0.1]}>
        <planeGeometry args={[10, 6]} />
        <meshStandardMaterial color="#2d572c" />
      </mesh>

      {/* Player board slots */}
      <group position={[0, -1, 0]}>
        {playerData.boardSlots.map((card, index) => (
          <mesh
            key={`player-slot-${index}`}
            position={[(index - 2) * 1.2, 0, 0]}
            onClick={() => {
              if (selectedCard && !card) {
                onPlaceCard(index);
              }
            }}
          >
            <planeGeometry args={[1, 1.4]} />
            <meshStandardMaterial
              color={selectedCard && !card ? "#8bc34a" : "#333333"}
              transparent
              opacity={0.3}
            />
            {card && (
              <Card
                card={card}
                position={[0, 0, 0.1]}
                scale={0.9}
                onClick={() => onCardSelect(card, "board", index)}
              />
            )}
          </mesh>
        ))}
      </group>

      {/* Enemy board slots */}
      <group position={[0, 1, 0]}>
        {enemyData.boardSlots.map((card, index) => (
          <mesh
            key={`enemy-slot-${index}`}
            position={[(index - 2) * 1.2, 0, 0]}
          >
            <planeGeometry args={[1, 1.4]} />
            <meshStandardMaterial color="#333333" transparent opacity={0.3} />
            {card && (
              <Card
                card={card}
                position={[0, 0, 0.1]}
                scale={0.9}
                rotation={[0, 0, Math.PI]}
                onClick={() => onCardSelect(card, "board", index)}
              />
            )}
          </mesh>
        ))}
      </group>
    </group>
  );
};

const Hand = ({
  cards,
  onCardSelect,
  selectedCard,
}: {
  cards: CardData[];
  onCardSelect: (card: CardData, source: "hand", index: number) => void;
  selectedCard: CardData | null;
}) => {
  return (
    <group position={[0, -3, 0]}>
      {cards.map((card, index) => {
        const offset = (index - (cards.length - 1) / 2) * 1.2;
        const isSelected = selectedCard && selectedCard.id === card.id;

        return (
          <Card
            key={`hand-card-${card.id}`}
            card={card}
            position={[offset, 0, 0]}
            rotation={[0, 0, 0]}
            scale={1.5}
            onClick={() => onCardSelect(card, "hand", index)}
            isHovered={!!isSelected}
          />
        );
      })}
    </group>
  );
};

const GameStatus = ({
  playerLife,
  enemyLife,
  currentPhase,
  onNextPhase,
}: {
  playerLife: number;
  enemyLife: number;
  currentPhase: GamePhase;
  onNextPhase: () => void;
}) => {
  return (
    <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center bg-gray-800 bg-opacity-80 text-white">
      <div className="text-lg">
        <span className="font-bold">Your Life:</span> {playerLife}
      </div>
      <div className="bg-purple-700 px-4 py-2 rounded-lg">
        Current Phase: {currentPhase}
      </div>
      <div className="text-lg">
        <span className="font-bold">Enemy Life:</span> {enemyLife}
      </div>
      <button
        onClick={onNextPhase}
        className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg flex items-center"
      >
        <span>Next Phase</span>
        <svg className="w-5 h-5 ml-2" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 010-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
};

const ActionLog = ({ logs }: { logs: string[] }) => {
  const logEndRef = useRef<HTMLDivElement>(null!);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  return (
    <div className="absolute bottom-0 right-0 w-64 h-48 bg-black bg-opacity-70 text-white p-2 overflow-y-auto text-sm">
      <h3 className="font-bold mb-1 border-b border-gray-500">Game Log</h3>
      <div className="space-y-1">
        {logs.map((log, index) => (
          <p key={index}>{log}</p>
        ))}
        <div ref={logEndRef} />
      </div>
    </div>
  );
};

export default function CardGame() {
  const [playerData, setPlayerData] = useState<Player>({
    id: "player",
    name: "Player",
    deck: shuffle([...initialDeck]),
    hand: [],
    lifeTotal: 20,
    boardSlots: [null, null, null, null, null],
  });

  const [enemyData, setEnemyData] = useState<Player>({
    id: "enemy",
    name: "Enemy",
    deck: shuffle([...initialDeck]),
    hand: [],
    lifeTotal: 20,
    boardSlots: [null, null, null, null, null],
  });

  const [currentPhase, setCurrentPhase] = useState<GamePhase>("DRAW");
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [selectedCardSource, setSelectedCardSource] = useState<
    "hand" | "board" | null
  >(null);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(
    null
  );
  const [gameLogs, setGameLogs] = useState<string[]>([
    "Game started. Draw a card to begin.",
  ]);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [winner, setWinner] = useState<string | null>(null);

  useEffect(() => {
    drawCards(playerData, 5);

    drawCards(enemyData, 5);
  }, []);

  useEffect(() => {
    if (playerData.lifeTotal <= 0) {
      setGameOver(true);
      setWinner("Enemy");
      addGameLog("Game over! Enemy wins!");
    } else if (enemyData.lifeTotal <= 0) {
      setGameOver(true);
      setWinner("Player");
      addGameLog("Game over! You win!");
    }
  }, [playerData.lifeTotal, enemyData.lifeTotal]);

  const drawCards = (player: Player, count: number) => {
    const newPlayer = { ...player };
    const newHand = [...newPlayer.hand];
    const newDeck = [...newPlayer.deck];

    for (let i = 0; i < count; i++) {
      if (newDeck.length > 0) {
        const card = newDeck.pop();
        if (card) newHand.push(card);
      }
    }

    newPlayer.hand = newHand;
    newPlayer.deck = newDeck;

    if (player.id === "player") {
      setPlayerData(newPlayer);
      addGameLog(`You drew ${count} card${count > 1 ? "s" : ""}.`);
    } else {
      setEnemyData(newPlayer);
      addGameLog(`Enemy drew ${count} card${count > 1 ? "s" : ""}.`);
    }
  };

  const addGameLog = (message: string) => {
    setGameLogs((prev) => [...prev, message]);
  };

  const handleCardSelect = (
    card: CardData,
    source: "hand" | "board",
    index: number
  ) => {
    if (gameOver) return;

    if (currentPhase === "PLAY" && source === "hand") {
      setSelectedCard(card);
      setSelectedCardSource(source);
      setSelectedCardIndex(index);
    } else {
      addGameLog(`Can't select cards during ${currentPhase} phase.`);
    }
  };

  const handlePlaceCard = (slotIndex: number) => {
    if (
      !selectedCard ||
      selectedCardSource !== "hand" ||
      selectedCardIndex === null
    )
      return;

    const sacrificeValue = selectedCard.sacrificeValue;
    if (sacrificeValue > 0) {
      const boardCardCount = playerData.boardSlots.filter(
        (card) => card !== null
      ).length;

      if (boardCardCount < sacrificeValue) {
        addGameLog(
          `You need ${sacrificeValue} cards to sacrifice to play ${selectedCard.name}, but you only have ${boardCardCount} on the board.`
        );
        return;
      }

      const newBoardSlots = [...playerData.boardSlots];
      let sacrificed = 0;

      for (
        let i = 0;
        i < newBoardSlots.length && sacrificed < sacrificeValue;
        i++
      ) {
        if (newBoardSlots[i] !== null) {
          addGameLog(
            `Sacrificed ${newBoardSlots[i]!.name} to play ${selectedCard.name}.`
          );
          newBoardSlots[i] = null;
          sacrificed++;
        }
      }

      newBoardSlots[slotIndex] = selectedCard;

      const newHand = [...playerData.hand];
      newHand.splice(selectedCardIndex, 1);

      setPlayerData({
        ...playerData,
        hand: newHand,
        boardSlots: newBoardSlots,
      });
    } else {
      const newBoardSlots = [...playerData.boardSlots];
      newBoardSlots[slotIndex] = selectedCard;

      const newHand = [...playerData.hand];
      newHand.splice(selectedCardIndex, 1);

      setPlayerData({
        ...playerData,
        hand: newHand,
        boardSlots: newBoardSlots,
      });
    }

    handleCardEffect(selectedCard);

    addGameLog(`Played ${selectedCard.name} to slot ${slotIndex + 1}.`);
    setSelectedCard(null);
    setSelectedCardSource(null);
    setSelectedCardIndex(null);
  };

  const handleCardEffect = (card: CardData) => {
    switch (card.effect) {
      case "DAMAGE_OPPONENT":
        if (card.effectValue) {
          setEnemyData({
            ...enemyData,
            lifeTotal: enemyData.lifeTotal - card.effectValue,
          });
          addGameLog(
            `${card.name}'s effect deals ${card.effectValue} damage to enemy.`
          );
        }
        break;
      case "HEAL_PLAYER":
        if (card.effectValue) {
          setPlayerData({
            ...playerData,
            lifeTotal: playerData.lifeTotal + card.effectValue,
          });
          addGameLog(
            `${card.name}'s effect heals you for ${card.effectValue} life.`
          );
        }
        break;
      case "DRAW_CARD":
        if (card.effectValue) {
          drawCards(playerData, card.effectValue);
        }
        break;
      case "BUFF_CARDS":
        if (card.effectValue) {
          const newBoardSlots = playerData.boardSlots.map((boardCard) => {
            if (boardCard && boardCard.id !== card.id) {
              return {
                ...boardCard,
                attack: boardCard.attack + (card.effectValue || 0),
              };
            }
            return boardCard;
          });

          setPlayerData({
            ...playerData,
            boardSlots: newBoardSlots,
          });

          addGameLog(
            `${card.name}'s effect buffs your other cards' attack by ${card.effectValue}.`
          );
        }
        break;
      case "DEBUFF_OPPONENT_CARDS":
        if (card.effectValue) {
          const newEnemyBoardSlots = enemyData.boardSlots.map((boardCard) => {
            if (boardCard) {
              return {
                ...boardCard,
                attack: Math.max(0, boardCard.attack - (card.effectValue || 0)),
              };
            }
            return boardCard;
          });

          setEnemyData({
            ...enemyData,
            boardSlots: newEnemyBoardSlots,
          });

          addGameLog(
            `${card.name}'s effect reduces enemy cards' attack by ${card.effectValue}.`
          );
        }
        break;
      default:
        break;
    }
  };

  const handleNextPhase = () => {
    if (gameOver) return;

    switch (currentPhase) {
      case "DRAW":
        setCurrentPhase("PLAY");
        addGameLog("Play phase: Play cards from your hand to the board.");
        break;
      case "PLAY":
        setCurrentPhase("ATTACK");
        break;
      case "ATTACK":
        processPlayerAttacks();
        setCurrentPhase("END");
        addGameLog("End phase: Ending your turn.");
        break;
      case "END":
        processEnemyTurn();
        setCurrentPhase("DRAW");
        drawCards(playerData, 1);
        addGameLog("Draw phase: Start your turn by drawing a card.");
        break;
    }

    setSelectedCard(null);
    setSelectedCardSource(null);
    setSelectedCardIndex(null);
  };

  const processPlayerAttacks = () => {
    const playerCards = playerData.boardSlots;
    const enemyCards = enemyData.boardSlots;

    playerCards.forEach((playerCard, index) => {
      if (!playerCard) return;

      const enemyCard = enemyCards[index];
      const noOpposingCard = enemyCard === null;

      if (noOpposingCard) {
        const damage = playerCard.attack;
        setEnemyData({
          ...enemyData,
          lifeTotal: enemyData.lifeTotal - damage,
        });
        addGameLog(`${playerCard.name} attacks directly for ${damage} damage!`);
      } else {
        const playerDamage = enemyCard.attack;
        const enemyDamage = playerCard.attack;

        const updatedPlayerCard = {
          ...playerCard,
          defense: playerCard.defense - playerDamage,
        };

        const updatedEnemyCard = {
          ...enemyCard,
          defense: enemyCard.defense - enemyDamage,
        };

        addGameLog(
          `${playerCard.name} (${playerCard.attack}/${playerCard.defense}) attacks ${enemyCard.name} (${enemyCard.attack}/${enemyCard.defense})!`
        );

        if (updatedPlayerCard.defense <= 0) {
          addGameLog(`${playerCard.name} was destroyed!`);
          playerCards[index] = null;
        } else {
          playerCards[index] = updatedPlayerCard;
        }

        if (updatedEnemyCard.defense <= 0) {
          addGameLog(`${enemyCard.name} was destroyed!`);
          enemyCards[index] = null;
        } else {
          enemyCards[index] = updatedEnemyCard;
        }

        setPlayerData({
          ...playerData,
          boardSlots: [...playerCards],
        });

        setEnemyData({
          ...enemyData,
          boardSlots: [...enemyCards],
        });
      }
    });
  };

  const processEnemyTurn = () => {
    addGameLog("Enemy turn begins.");

    drawCards(enemyData, 1);

    const newEnemyHand = [...enemyData.hand];
    const newEnemyBoard = [...enemyData.boardSlots];

    const boardCardCount = newEnemyBoard.filter((card) => card !== null).length;
    const playableCards = newEnemyHand.filter(
      (card) => card.sacrificeValue <= boardCardCount
    );

    if (playableCards.length > 0) {
      const emptySlotIndex = newEnemyBoard.findIndex((slot) => slot === null);

      if (emptySlotIndex !== -1) {
        const cardToPlay = playableCards[0];
        const cardIndex = newEnemyHand.findIndex(
          (card) => card.id === cardToPlay.id
        );

        newEnemyHand.splice(cardIndex, 1);

        if (cardToPlay.sacrificeValue > 0) {
          let sacrificed = 0;

          for (
            let i = 0;
            i < newEnemyBoard.length && sacrificed < cardToPlay.sacrificeValue;
            i++
          ) {
            if (newEnemyBoard[i] !== null) {
              addGameLog(
                `Enemy sacrificed ${newEnemyBoard[i]!.name} to play ${
                  cardToPlay.name
                }.`
              );
              newEnemyBoard[i] = null;
              sacrificed++;
            }
          }
        }

        newEnemyBoard[emptySlotIndex] = cardToPlay;
        addGameLog(`Enemy plays ${cardToPlay.name}.`);

        switch (cardToPlay.effect) {
          case "DAMAGE_OPPONENT":
            if (cardToPlay.effectValue) {
              setPlayerData((prev) => ({
                ...prev,
                lifeTotal: prev.lifeTotal - cardToPlay.effectValue!,
              }));
              addGameLog(
                `Enemy's ${cardToPlay.name} deals ${cardToPlay.effectValue} damage to you.`
              );
            }
            break;
          case "HEAL_PLAYER":
            if (cardToPlay.effectValue) {
              setEnemyData((prev) => ({
                ...prev,
                lifeTotal: prev.lifeTotal + cardToPlay.effectValue!,
              }));
              addGameLog(
                `Enemy's ${cardToPlay.name} heals for ${cardToPlay.effectValue} life.`
              );
            }
            break;
          case "DRAW_CARD":
            if (cardToPlay.effectValue) {
              drawCards(enemyData, cardToPlay.effectValue);
            }
            break;

          default:
            break;
        }
      }
    }

    const playerCards = playerData.boardSlots;

    newEnemyBoard.forEach((enemyCard, index) => {
      if (enemyCard && !playerCards[index]) {
        const damage = enemyCard.attack;
        setPlayerData((prev) => ({
          ...prev,
          lifeTotal: prev.lifeTotal - damage,
        }));
        addGameLog(
          `Enemy's ${enemyCard.name} attacks directly for ${damage} damage!`
        );
      } else if (enemyCard && playerCards[index]) {
        const playerCard = playerCards[index];
        const enemyDamage = playerCard.attack;
        const playerDamage = enemyCard.attack;

        const updatedEnemyCard = {
          ...enemyCard,
          defense: enemyCard.defense - enemyDamage,
        };

        const updatedPlayerCard = {
          ...playerCard,
          defense: playerCard.defense - playerDamage,
        };

        addGameLog(
          `Enemy's ${enemyCard.name} (${enemyCard.attack}/${enemyCard.defense}) attacks ${playerCard.name} (${playerCard.attack}/${playerCard.defense})!`
        );

        if (updatedEnemyCard.defense <= 0) {
          addGameLog(`Enemy's ${enemyCard.name} was destroyed!`);
          newEnemyBoard[index] = null;
        } else {
          newEnemyBoard[index] = updatedEnemyCard;
        }

        if (updatedPlayerCard.defense <= 0) {
          addGameLog(`Your ${playerCard.name} was destroyed!`);
          playerCards[index] = null;
        } else {
          playerCards[index] = updatedPlayerCard;
        }
      }
    });

    setEnemyData({
      ...enemyData,
      hand: newEnemyHand,
      boardSlots: newEnemyBoard,
    });

    setPlayerData({
      ...playerData,
      boardSlots: [...playerCards],
    });

    addGameLog("Enemy turn ends.");
  };

  const GameOverOverlay = () => {
    if (!gameOver) return null;

    return (
      <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center text-white">
        <h2 className="text-4xl font-bold mb-4">
          {winner === "Player" ? "You Win!" : "You Lose!"}
        </h2>
        <p className="text-xl mb-6">
          Final Score: {playerData.lifeTotal} - {enemyData.lifeTotal}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg text-lg"
        >
          Play Again
        </button>
      </div>
    );
  };

  return (
    <div className="relative w-full h-screen bg-gray-900">
      <Canvas>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />

        <Board
          playerData={playerData}
          enemyData={enemyData}
          selectedCard={selectedCard}
          onCardSelect={handleCardSelect}
          onPlaceCard={handlePlaceCard}
        />

        <Hand
          cards={playerData.hand}
          onCardSelect={handleCardSelect}
          selectedCard={selectedCard}
        />

        <OrbitControls
          enablePan={true}
          enableRotate={false}
          minDistance={3}
          maxDistance={10}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>

      <GameStatus
        playerLife={playerData.lifeTotal}
        enemyLife={enemyData.lifeTotal}
        currentPhase={currentPhase}
        onNextPhase={handleNextPhase}
      />

      <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white p-3 rounded-lg">
        <h3 className="font-bold mb-1">Game Info</h3>
        <p>Cards in deck: {playerData.deck.length}</p>
        <p>Cards in hand: {playerData.hand.length}</p>
        {selectedCard && (
          <div className="mt-2 p-2 bg-gray-700 rounded">
            <p className="font-bold">{selectedCard.name}</p>
            <p>
              🗡️: {selectedCard.attack} | 🛡️: {selectedCard.defense}
            </p>
            <p>Sacrifice: {selectedCard.sacrificeValue}</p>
            {selectedCard.effect !== "NONE" && (
              <p className="text-xs mt-1">{selectedCard.effectDescription}</p>
            )}
          </div>
        )}
      </div>

      <ActionLog logs={gameLogs} />
      <GameOverOverlay />
    </div>
  );
}
