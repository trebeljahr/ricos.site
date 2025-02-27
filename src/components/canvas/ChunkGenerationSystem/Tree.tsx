import {
  BirchTree_Snow_1,
  CommonTree_1,
  CommonTree_Dead_4,
  PalmTree_1,
  PineTree_1,
  PineTree_2,
} from "@models/nature_pack";
import { Tree1 } from "@models/simple_nature_pack";
import { memo } from "react";
import { Vector3 } from "three";
import { BirchTree } from "../BirchTree";
import { TreeType } from "./TreeSystem";

export const Tree = memo(
  ({
    type,
    position,
    scale = [1, 1, 1],
  }: {
    type: TreeType;
    position: Vector3;
    scale?: [number, number, number];
  }) => {
    switch (type) {
      case TreeType.BIRCH:
        return <BirchTree position={position} scale={scale} />;
      case TreeType.OAK:
        return <Tree1 position={position} scale={scale} />;
      case TreeType.PINE:
        return <PineTree_1 position={position} scale={scale} />;
      case TreeType.SPRUCE:
        return <PineTree_2 position={position} scale={scale} />;
      case TreeType.PALM:
        return <PalmTree_1 position={position} scale={scale} />;
      case TreeType.ACACIA:
        return <BirchTree_Snow_1 position={position} scale={scale} />;
      case TreeType.JUNGLE:
        return <CommonTree_1 position={position} scale={scale} />;
      case TreeType.DEAD:
        return <CommonTree_Dead_4 position={position} scale={scale} />;
      default:
        return <BirchTree position={position} scale={scale} />;
    }
  }
);
