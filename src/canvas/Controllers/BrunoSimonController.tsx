import CharacterWithAnimations from "@r3f/Characters/ControllableCharacter";
import { CameraContextProvider } from "@r3f/Contexts/CameraContext";
import { FlyCameraContextProvider } from "@r3f/Contexts/FlyCameraContext";
import {
  PlayerContextProvider,
  usePlayerContext,
} from "@r3f/Contexts/PlayerContext";
import { PointerContextProvider } from "@r3f/Contexts/PointerContext";
import { ThirdPersonCameraContextProvider } from "@r3f/Contexts/ThirdPersonCameraContext";
import { MichelleCharacter } from "@r3f/models/MichelleCharacter";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Group, Quaternion } from "three";

const tempQ = new Quaternion();
const DemoComponent = () => {
  const boxRef = useRef<Group>(null!);

  const player = usePlayerContext();

  useFrame(() => {
    boxRef.current.position.fromArray(player.position.current);
    boxRef.current.rotation.y = player.rotation;
  });

  return (
    <group>
      {/* <Box ref={boxRef} args={[1, 1, 1]} castShadow receiveShadow>
        <meshPhysicalMaterial color="pink" />
      </Box> */}
      <group ref={boxRef}>
        <group position={[0, 0, 0]} rotation={[0, Math.PI, 0]}>
          <CharacterWithAnimations characterName="michelle" />
        </group>
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
              <DemoComponent />
            </PlayerContextProvider>
          </ThirdPersonCameraContextProvider>
        </FlyCameraContextProvider>
      </CameraContextProvider>
    </PointerContextProvider>
  );
};
