import { SelectionType } from "./SelectionTypes";

export enum EffectTypes {
  DRAW_CARD = "DRAW_CARD",
  HEAL_PLAYER = "HEAL_PLAYER",
  DAMAGE_OPPONENT = "DAMAGE_OPPONENT",
  BUFF_CARDS_ATTACK = "BUFF_CARDS_ATTACK",
  DEBUFF_OPPONENT_CARDS = "DEBUFF_OPPONENT_CARDS",
  BUFF_CARDS_ATTACK_AND_DEFENSE = "BUFF_CARDS_ATTACK_AND_DEFENSE",
  NONE = "NONE",
}

export type CardEffect = {
  id: string;
  type: EffectTypes;
  selectionType?: SelectionType;
  value?: number;
};
