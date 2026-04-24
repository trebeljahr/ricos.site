import { MichelleCharacter, michelleGlbUrl } from "@r3f/AllModels/MichelleCharacter";
import type { GroupProps, Object3DProps } from "@react-three/fiber";
import Ecctrl, { EcctrlAnimation } from "ecctrl";
import type { ForwardRefExoticComponent, RefAttributes } from "react";
import type { Group } from "three";

const animationSet = {
  idle: "Idle",
  walk: "Walk",
  run: "Run",
  jump: "Jump_Start",
  jumpIdle: "Fall_Idle",
  jumpLand: "Jump_Land",
};

export type SimpleModelType = (props: JSX.IntrinsicElements["group"]) => JSX.Element;

export type ForwardedRefModelType = ForwardRefExoticComponent<
  Omit<GroupProps, "ref"> & RefAttributes<Group>
>;

export type ModelType = SimpleModelType | ForwardedRefModelType;

export const EcctrlController = ({
  Model = MichelleCharacter,
  position = [0, 0, 5],
}: {
  Model?: ModelType;
  position?: Object3DProps["position"];
}) => {
  return (
    <Ecctrl
      position={position}
      animated
      slopeDownExtraForce={0}
      camCollision={true}
      camCollisionOffset={0.5}
      // mode="FixedCamera"
    >
      <EcctrlAnimation characterURL={michelleGlbUrl} animationSet={animationSet}>
        <Model />
      </EcctrlAnimation>
    </Ecctrl>
  );
};
