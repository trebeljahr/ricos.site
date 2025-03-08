import { getHeight } from "@r3f/ChunkGenerationSystem/TerrainTile";
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
      player.rotation = thirdPersonCamera.theta;

      if (forward) {
        if (strafeLeft) player.rotation += Math.PI * 0.25;
        else if (strafeRight) player.rotation -= Math.PI * 0.25;
      } else if (backward) {
        if (strafeLeft) player.rotation += Math.PI * 0.75;
        else if (strafeRight) player.rotation -= Math.PI * 0.75;
        else player.rotation -= Math.PI;
      } else if (strafeLeft) {
        player.rotation += Math.PI * 0.5;
      } else if (strafeRight) {
        player.rotation -= Math.PI * 0.5;
      }

      const speed = boost ? inputBoostSpeed : inputSpeed;

      const x = Math.sin(player.rotation) * delta * speed;
      const z = Math.cos(player.rotation) * delta * speed;

      position.current[0] -= x;
      position.current[2] -= z;
    }

    vec3.sub(position.delta, position.current, position.previous);
    vec3.copy(position.previous, position.current);

    player.speed = vec3.len(position.delta);

    // Update elevation
    const { height: elevation } = getHeight(
      position.current[0],
      position.current[2]
    );

    if (elevation) position.current[1] = elevation;
    else position.current[1] = 0;
  });

  return playerRef.current;
};
