import { useGLTF } from "@react-three/drei";
import { memo, useMemo } from "react";
import { Vector3 } from "three";
import { TreeType } from "./TreeSystem";
import { BirchTree } from "../BirchTree";

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
      //   case TreeType.OAK:
      //     return <OakTree position={position} scale={scale} />;
      //   case TreeType.PINE:
      //     return <PineTree position={position} scale={scale} />;
      //   case TreeType.SPRUCE:
      //     return <SpruceTree position={position} scale={scale} />;
      //   case TreeType.PALM:
      //     return <PalmTree position={position} scale={scale} />;
      //   case TreeType.ACACIA:
      //     return <AcaciaTree position={position} scale={scale} />;
      //   case TreeType.JUNGLE:
      //     return <JungleTree position={position} scale={scale} />;
      //   case TreeType.DEAD:
      //     return <DeadTree position={position} scale={scale} />;
      default:
        return <BirchTree position={position} scale={scale} />;
    }
  }
);
