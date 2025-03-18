import CharacterWithAnimations from "@r3f/Characters/ControllableCharacter";
import { CameraContextProvider } from "@r3f/Contexts/CameraContext";
import { FlyCameraContextProvider } from "@r3f/Contexts/FlyCameraContext";
import {
  PlayerContextProvider,
  usePlayerContext,
} from "@r3f/Contexts/PlayerContext";
import { PointerContextProvider } from "@r3f/Contexts/PointerContext";
import { ThirdPersonCameraContextProvider } from "@r3f/Contexts/ThirdPersonCameraContext";
import { MichelleCharacter } from "@r3f/AllModels/MichelleCharacter";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Group, Quaternion } from "three";

const tempQ = new Quaternion();

const Character = () => {
  const playerGroupRef = useRef<Group>(null!);
  const player = usePlayerContext();

  useFrame(() => {
    playerGroupRef.current.position.fromArray(player.position.current);
    playerGroupRef.current.rotation.y = player.rotation;
  });

  return (
    <group ref={playerGroupRef}>
      <group rotation={[0, Math.PI, 0]}>
        <CharacterWithAnimations characterName="michelle" />
      </group>
    </group>
  );
};

export const BrunoSimonController = () => {
  return (
    <PointerContextProvider>
      <CameraContextProvider>
        <FlyCameraContextProvider>
          <ThirdPersonCameraContextProvider>
            <PlayerContextProvider>
              <Character />
            </PlayerContextProvider>
          </ThirdPersonCameraContextProvider>
        </FlyCameraContextProvider>
      </CameraContextProvider>
    </PointerContextProvider>
  );
};
