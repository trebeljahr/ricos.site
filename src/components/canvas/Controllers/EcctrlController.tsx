import { MichelleCharacter, michelleGlbUrl } from "@models/MichelleCharacter";
import Ecctrl, { EcctrlAnimation } from "ecctrl";

const animationSet = {
  idle: "Idle",
  walk: "Walk",
  run: "Run",
  jump: "Jump_Start",
  jumpIdle: "Fall_Idle",
  jumpLand: "Jump_Land",
};

export const EcctrlController = ({
  Model = MichelleCharacter,
}: {
  Model?: typeof MichelleCharacter;
}) => {
  return (
    <Ecctrl
      position={[0, 0, 5]}
      animated
      slopeDownExtraForce={0}
      camCollision={false}
      mode="FixedCamera"
    >
      <EcctrlAnimation
        characterURL={michelleGlbUrl}
        animationSet={animationSet}
      >
        <Model />
      </EcctrlAnimation>
    </Ecctrl>
  );
};
