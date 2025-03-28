import { Vector3 } from "three";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export const useGame = create(
  subscribeWithSelector<State>((set, get) => {
    return {
      moveToPoint: new Vector3(0, 0, 0),
      setMoveToPoint: (point: Vector3 | null) => {
        set(() => {
          return { moveToPoint: point };
        });
      },

      getMoveToPoint: () => {
        return {
          moveToPoint: get().moveToPoint,
        };
      },
    };
  })
);

type State = {
  moveToPoint: Vector3 | null;
  setMoveToPoint: (point: Vector3 | null) => void;
  getMoveToPoint: () => {
    moveToPoint: Vector3 | null;
  };
};
