import { nanoid } from "nanoid";
import { CardEffect, EffectTypes } from "./EffectType";
import { SelectionType } from "./SelectionTypes";

export const createFireEffect = (value: number): CardEffect => {
  return {
    id: nanoid(),
    type: EffectTypes.DAMAGE_OPPONENT,
    selectionType: SelectionType.ENEMY,
    value: value,
  };
};
