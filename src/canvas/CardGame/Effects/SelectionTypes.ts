export enum SelectionType {
  NONE = "NONE",
  CARD = "CARD",
  HAND = "HAND",
  PLAYER_CARD = "PLAYER_CARD",
  OPPONENT_CARD = "OPPONENT_CARD",
  PLAYER = "PLAYER",
  ENEMY = "ENEMY",
  DECK = "DECK",
}

const switchSelectionType = (
  gameState: GameState,
  selectionType: SelectionType
) => {
  switch (selectionType) {
    case SelectionType.CARD:
      // Handle card selection
      break;
    case SelectionType.HAND:
      // Handle hand selection
      break;
    case SelectionType.PLAYER_CARD:
      // Handle player card selection
      break;
    case SelectionType.OPPONENT_CARD:
      // Handle opponent card selection
      break;
    case SelectionType.PLAYER:
      // Handle player selection
      break;
    case SelectionType.ENEMY:
      // Handle enemy selection
      break;
    case SelectionType.DECK:
      // Handle deck selection
      break;
    default:
      // Handle default case
      break;
  }
};
