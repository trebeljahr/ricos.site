import {
  BirchTree_1,
  BirchTree_2,
  BirchTree_3,
  BirchTree_4,
  BirchTree_5,
  BirchTree_Autumn_1,
  BirchTree_Autumn_2,
  BirchTree_Autumn_3,
  BirchTree_Autumn_4,
  BirchTree_Autumn_5,
  BirchTree_Snow_1,
  CommonTree_1,
  CommonTree_2,
  CommonTree_3,
  CommonTree_4,
  CommonTree_5,
  CommonTree_Dead_4,
  PalmTree_1,
  PalmTree_2,
  PalmTree_3,
  PalmTree_4,
  PineTree_1,
  PineTree_2,
  PineTree_3,
  PineTree_4,
  PineTree_5,
  Willow_1,
  Willow_2,
  Willow_3,
  Willow_4,
  Willow_5,
} from "@models/nature_pack";
import { Tree1, Tree2, Tree4 } from "@models/simple_nature_pack";
import { memo } from "react";
import { Vector3 } from "three";
import { BirchTree } from "../BirchTree";
import { TreeType } from "./TreeSystem";
import { pickRandomFromArray } from "./utils";

type Props = JSX.IntrinsicElements["group"];

const BirchTrees = [
  (props: Props) => <BirchTree_1 {...props} />,
  (props: Props) => <BirchTree_2 {...props} />,
  (props: Props) => <BirchTree_3 {...props} />,
  (props: Props) => <BirchTree_4 {...props} />,
  (props: Props) => <BirchTree_5 {...props} />,
];

const AcaciaTrees = [
  (props: Props) => <Tree1 {...props} />,
  (props: Props) => <Tree4 {...props} />,
  (props: Props) => <Tree2 {...props} />,
];

const PineTrees = [
  (props: Props) => <PineTree_1 {...props} />,
  (props: Props) => <PineTree_2 {...props} />,
  (props: Props) => <PineTree_3 {...props} />,
  (props: Props) => <PineTree_4 {...props} />,
  (props: Props) => <PineTree_5 {...props} />,
];

const AutumnBirchTrees = [
  (props: Props) => <BirchTree_Autumn_1 {...props} />,
  (props: Props) => <BirchTree_Autumn_2 {...props} />,
  (props: Props) => <BirchTree_Autumn_3 {...props} />,
  (props: Props) => <BirchTree_Autumn_4 {...props} />,
  (props: Props) => <BirchTree_Autumn_5 {...props} />,
];

const PalmTrees = [
  (props: Props) => <PalmTree_1 {...props} />,
  (props: Props) => <PalmTree_2 {...props} />,
  (props: Props) => <PalmTree_3 {...props} />,
  (props: Props) => <PalmTree_4 {...props} />,
];

const WillowTrees = [
  (props: Props) => <Willow_1 {...props} />,
  (props: Props) => <Willow_2 {...props} />,
  (props: Props) => <Willow_3 {...props} />,
  (props: Props) => <Willow_4 {...props} />,
  (props: Props) => <Willow_5 {...props} />,
];

const OakTrees = [
  (props: Props) => <CommonTree_1 {...props} />,
  (props: Props) => <CommonTree_2 {...props} />,
  (props: Props) => <CommonTree_3 {...props} />,
  (props: Props) => <CommonTree_4 {...props} />,
  (props: Props) => <CommonTree_5 {...props} />,
];

export const Tree = memo(
  ({
    type,
    position,
    rotation = [0, 0, 0],
    scale = [1, 1, 1],
  }: {
    type: TreeType;
    position: Vector3;
    scale?: [number, number, number];
    rotation?: [number, number, number];
  }) => {
    switch (type) {
      case TreeType.BIRCH:
        return pickRandomFromArray(BirchTrees)({ position, scale, rotation });
      case TreeType.OAK:
        return pickRandomFromArray(OakTrees)({ position, scale, rotation });
      case TreeType.PINE:
        return pickRandomFromArray(PineTrees)({ position, scale, rotation });
      case TreeType.PALM:
        return pickRandomFromArray(PalmTrees)({ position, scale, rotation });
      case TreeType.ACACIA:
        return pickRandomFromArray(AcaciaTrees)({ position, scale, rotation });
      case TreeType.JUNGLE:
        return pickRandomFromArray(WillowTrees)({ position, scale, rotation });
      default:
        return (
          <BirchTree position={position} scale={scale} rotation={rotation} />
        );
    }
  }
);
