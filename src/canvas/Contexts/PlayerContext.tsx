import { getHeight } from "@r3f/ChunkGenerationSystem/getHeight";
import { useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { vec3 } from "gl-matrix";
import { createContext, PropsWithChildren, useContext, useRef } from "react";
import { useThirdPersonCameraContext } from "./ThirdPersonCameraContext";

const initial = vec3.fromValues(10, 0, 1);

const defaultPlayerState = {
  rotation: 0,
  inputSpeed: 10,
  inputBoostSpeed: 30,
  position: {
    current: initial,
    previous: vec3.clone(initial),
    delta: vec3.create(),
  },
  speed: 0,
};

const PlayerContext = createContext(defaultPlayerState);

export const usePlayerContext = () => {
  return useContext(PlayerContext);
};

export const PlayerContextProvider = ({ children }: PropsWithChildren) => {
  const pointer = usePlayer();

  return (
    <PlayerContext.Provider value={pointer}>{children}</PlayerContext.Provider>
  );
};

const usePlayer = () => {
  const [, get] = useKeyboardControls();

  const playerRef = useRef(defaultPlayerState);

  const thirdPersonCamera = useThirdPersonCameraContext();

  useFrame((_, delta) => {
    const {
      forward,
      backward,
      leftward: strafeLeft,
      rightward: strafeRight,
      run: boost,
    } = get();

    const player = playerRef.current;

    const { inputSpeed, inputBoostSpeed, position } = player;
    if (forward || backward || strafeLeft || strafeRight) {
      let targetRotation = thirdPersonCamera.theta;

      if (forward) {
        if (strafeLeft) targetRotation += Math.PI * 0.25;
        else if (strafeRight) targetRotation -= Math.PI * 0.25;
      } else if (backward) {
        if (strafeLeft) targetRotation += Math.PI * 0.75;
        else if (strafeRight) targetRotation -= Math.PI * 0.75;
        else targetRotation -= Math.PI;
      } else if (strafeLeft) {
        targetRotation += Math.PI * 0.5;
      } else if (strafeRight) {
        targetRotation -= Math.PI * 0.5;
      }

      // Smoothly interpolate rotation
      let diff = targetRotation - player.rotation;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      player.rotation += diff * Math.min(1, 15 * delta);

      const speed = boost ? inputBoostSpeed : inputSpeed;

      const x = Math.sin(player.rotation) * delta * speed;
      const z = Math.cos(player.rotation) * delta * speed;

      position.current[0] -= x;
      position.current[2] -= z;
    }

    // Update elevation BEFORE computing delta so Y is consistent
    const { height } = getHeight(
      position.current[0],
      position.current[2]
    );
    position.current[1] = height;

    vec3.sub(position.delta, position.current, position.previous);
    vec3.copy(position.previous, position.current);

    player.speed = vec3.len(position.delta);
  }, -10); // Run early, before character rendering

  return playerRef.current;
};
